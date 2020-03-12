import {
  JsonRpcRequest,
  JsonRpcBatchResponse,
  JsonRpcSuccess,
  JsonRpcFailure,
  JsonRpcParams,
  JsonRpcMethod,
  JsonRpcId,
} from "./jsonRpc2Types.ts"
type RequestInit = __domTypes.RequestInit
type AnyFunction = (...args: any[]) => any
type Batches =
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
  handleUnsuccessfulResponse?: AnyFunction
) {
  return fetch(url, fetchInit)
    .then((res: Response) => {
      if (res.ok || !handleUnsuccessfulResponse) {
        const contentType = res.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          return res.json()
        } else {
          return void 0
        }
      } else return handleUnsuccessfulResponse(res)
    })
    .catch(err => {
      if (err instanceof BadServerDataError) return Promise.reject(err)
      return Promise.reject(
        new BadServerDataError("Error in fetch API: " + err.message, -32001)
      )
    })
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

function createRpcBatchObj(batchObj: Batches, notification = false) {
  return Array.isArray(batchObj)
    ? batchObj.map(el =>
        createRpcRequestObj(
          el[0],
          el[1],
          notification ? undefined : generateID()
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
  options: RequestInit & { notification?: boolean; id?: JsonRpcId } = {},
  handleUnsuccessfulResponse?: AnyFunction
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
                options.notification ? undefined : options.id || generateID()
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
  private handleUnsuccessfulResponse?: AnyFunction;
  [key: string]: any // necessary for es6 proxy
  constructor(
    url: string,
    userOptions: RequestInit = {},
    handleUnsuccessfulResponse?: AnyFunction
  ) {
    this.url = url
    this.handleUnsuccessfulResponse = handleUnsuccessfulResponse
    this.fetchInit = {
      ...userOptions,
      headers: { ...userOptions.headers, "Content-Type": "application/json" },
    }
  }

  async makeRpcCall(
    stringifiedRpcRequestObj: string,
    shouldReturnBatchResultsAsArray = true
  ) {
    const rpcResponseObjOrBatch = await send(
      this.url,
      {
        ...this.fetchInit,
        body: stringifiedRpcRequestObj,
      },
      this.handleUnsuccessfulResponse
    )
    return this.handleResponseData(
      rpcResponseObjOrBatch,
      shouldReturnBatchResultsAsArray
    )
  }

  batch(batchObj: Batches, notification = false) {
    return this.makeRpcCall(
      JSON.stringify(createRpcBatchObj(batchObj, notification)),
      Array.isArray(batchObj)
    )
  }

  handleResponseData(
    rpcResponseObjOrBatch: JsonRpcBatchResponse,
    shouldReturnBatchResultsAsArray = true
  ) {
    if (Array.isArray(rpcResponseObjOrBatch)) {
      return shouldReturnBatchResultsAsArray
        ? rpcResponseObjOrBatch.reduce((acc, rpcResponseObj) => {
            acc.push(this.checkRpcResult(rpcResponseObj))
            return acc
          }, [] as any[])
        : rpcResponseObjOrBatch.reduce((acc, rpcResponseObj) => {
            if (rpcResponseObj.id !== null) {
              acc[rpcResponseObj.id as string | number] = this.checkRpcResult(
                rpcResponseObj
              )
              return acc
            } else {
              // id might be null
              if ("null" in acc)
                acc["null"].push(this.checkRpcResult(rpcResponseObj))
              else acc["null"] = [this.checkRpcResult(rpcResponseObj)]
              return acc
            }
          }, {} as any)
    } else {
      return this.checkRpcResult(rpcResponseObjOrBatch)
    }
  }

  private checkRpcResult(data: JsonRpcSuccess | JsonRpcFailure) {
    if (typeof data !== "object") {
      return new BadServerDataError("The sent back data is no object.", -32002)
    } else if ("result" in data) {
      return data.result
    } else if (data.error) {
      const error = new BadServerDataError(data.error.message, data.error.code)
      // if error stack from server side has been transmitted, then use the server data:
      if (data.error.data) Object.assign(error, data.error.data)
      return error
    } else
      return new BadServerDataError(
        "Data or Error Object is not present.",
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
