import {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcBatchResponse,
  JsonRpcSuccess,
  JsonRpcFailure,
  JsonRpcParams,
  JsonRpcMethod,
  JsonRpcId,
  JsonValue,
} from "./jsonRpc2Types.ts"

type Options = RequestInit & { isNotification?: boolean; id?: JsonRpcId }
type Batch =
  | [string, JsonRpcParams?][]
  | Record<string, [string, JsonRpcParams?]>

class BadServerDataError extends Error {
  name: string
  code: number
  constructor(message: string, errorCode: number) {
    super(message)
    this.name = "BadServerDataError"
    this.code = errorCode
  }
}

function send(
  url: string,
  fetchInit: RequestInit,
  handleUnsuccessfulResponse?: (res: Response) => any
) {
  return fetch(url, fetchInit)
    .then((res: Response) => {
      if (res.ok) {
        // check if rpc was a notification
        return res.text().then(text => (text ? JSON.parse(text) : undefined))
      } else if (handleUnsuccessfulResponse) {
        return handleUnsuccessfulResponse(res)
      } else {
        throw Error(`${res.statusText}: ${res.status}`)
      }
    })
    .catch(err =>
      Promise.reject(
        new BadServerDataError("Error in fetch API: " + err.message, -32001)
      )
    )
}

function createRpcRequestObj(
  methodName: string,
  params?: JsonRpcParams,
  id?: JsonRpcId
): JsonRpcRequest {
  const rpcRequestObj: JsonRpcRequest = {
    jsonrpc: "2.0",
    method: methodName,
  }
  if (params) rpcRequestObj.params = params
  if (id !== undefined) rpcRequestObj.id = id
  return rpcRequestObj
}

function createRpcBatchObj(batchObj: Batch, isNotification = false) {
  return Array.isArray(batchObj)
    ? batchObj.map(el =>
        createRpcRequestObj(
          el[0],
          el[1],
          isNotification ? undefined : generateID()
        )
      )
    : Object.entries(batchObj).map(([key, value]) =>
        createRpcRequestObj(value[0], value[1], key)
      )
}

function generateID(size = 7): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz"
  for (var str = "", i = 0; i < size; i += 1)
    str += chars[Math.floor(Math.random() * chars.length)]
  return str
}

function createRemote(
  url: string,
  options: Options = {},
  handleUnsuccessfulResponse?: (res: Response) => any
) {
  const handler = {
    get(client: Client, name: JsonRpcMethod) {
      if ((client as any)[name] !== undefined) {
        return client[name as keyof Client]
      } else {
        return (...args: JsonRpcParams[]) =>
          client.makeRpcCall(
            JSON.stringify(
              createRpcRequestObj(
                name,
                args,
                options.isNotification ? undefined : options.id || generateID()
              )
            )
          )
      }
    },
  }
  const client = new Client(url, options, handleUnsuccessfulResponse)
  return new Proxy(client, handler)
}

class Client {
  private url: string
  private fetchInit: RequestInit
  private isNotification = false
  private handleUnsuccessfulResponse?: (res: Response) => any;
  [key: string]: any // necessary for es6 proxy
  constructor(
    url: string,
    options: Options = {},
    handleUnsuccessfulResponse?: (res: Response) => any
  ) {
    this.url = url
    this.isNotification = options.isNotification || false
    this.handleUnsuccessfulResponse = handleUnsuccessfulResponse
    this.fetchInit = {
      ...options,
      headers: { ...options.headers, "Content-Type": "application/json" },
    }
  }

  async makeRpcCall(
    stringifiedRpcRequestObj: string,
    shouldReturnBatchResultsAsArray = true
  ): Promise<JsonValue | undefined> {
    const rpcResponseObjOrBatchOrUndefined = (await send(
      this.url,
      {
        ...this.fetchInit,
        body: stringifiedRpcRequestObj,
      },
      this.handleUnsuccessfulResponse
    )) as JsonRpcResponse | JsonRpcBatchResponse | undefined
    return rpcResponseObjOrBatchOrUndefined === undefined
      ? undefined
      : this.handleResponseData(
          rpcResponseObjOrBatchOrUndefined,
          shouldReturnBatchResultsAsArray
        )
  }

  batch(batchObj: Batch) {
    return this.makeRpcCall(
      JSON.stringify(createRpcBatchObj(batchObj, this.isNotification)),
      Array.isArray(batchObj)
    )
  }

  // public for tests
  handleResponseData(
    rpcResponseObjOrBatch: JsonRpcResponse | JsonRpcBatchResponse,
    shouldReturnBatchResultsAsArray = true
  ) {
    if (Array.isArray(rpcResponseObjOrBatch)) {
      return shouldReturnBatchResultsAsArray
        ? rpcResponseObjOrBatch.reduce<JsonValue[]>((acc, rpcResponseObj) => {
            acc.push(this.checkRpcResult(rpcResponseObj))
            return acc
          }, [])
        : rpcResponseObjOrBatch.reduce<Record<string, JsonValue>>(
            (acc, rpcResponseObj) => {
              if (rpcResponseObj.id !== null) {
                acc[rpcResponseObj.id] = this.checkRpcResult(rpcResponseObj)
                return acc
              } else {
                // id might be null
                if (Array.isArray(acc.null))
                  acc["null"].push(this.checkRpcResult(rpcResponseObj))
                else acc["null"] = [this.checkRpcResult(rpcResponseObj)]
                return acc
              }
            },
            {}
          )
    } else {
      return this.checkRpcResult(rpcResponseObjOrBatch)
    }
  }

  private checkRpcResult(data: JsonRpcSuccess | JsonRpcFailure) {
    if (typeof data !== "object" || data === null) {
      throw new BadServerDataError("The sent back data is no object.", -32002)
    } else if ("result" in data && "id" in data) {
      return data.result as JsonValue
    } else if (data.error) {
      const error = new BadServerDataError(data.error.message, data.error.code)
      // if error stack from server side has been transmitted, then use the server data:
      if (data.error.data) Object.assign(error, data.error.data)
      throw error
    } else
      throw new BadServerDataError(
        "Received data is no RPC response object.",
        -32002
      )
  }
}

export {
  createRemote,
  send,
  createRpcRequestObj,
  createRpcBatchObj,
  Client,
  BadServerDataError,
}
