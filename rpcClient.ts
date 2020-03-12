import {
  JsonRpcRequest,
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

class Client {
  url: string
  fetchInit: RequestInit
  handleUnsuccessfulResponse?: AnyFunction;
  [key: string]: any // necessary for es6 proxy
  constructor(
    url: string,
    userOptions: RequestInit,
    handleUnsuccessfulResponse?: AnyFunction
  ) {
    const defaultOptions: RequestInit = {
      method: "POST", // *GET, POST, PUT, DELETE, etc.
      mode: "cors", // no-cors, cors, *same-origin
      cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
      credentials: "same-origin", // include, *same-origin, omit
      redirect: "follow", // manual, *follow, error
      referrer: "no-referrer", // no-referrer, *client
    }
    this.fetchInit = {
      ...defaultOptions,
      ...userOptions,
      headers: { ...userOptions.headers, "Content-Type": "application/json" },
    }
    this.url = url
    if (handleUnsuccessfulResponse)
      this.handleUnsuccessfulResponse = handleUnsuccessfulResponse
  }
  // [[str:method,any:params],[str:method,any:params]] || {Id1:[str:method,any:params],id2:[str:method,any:params]}
  batch(batchObj: Batches, notification = false) {
    return this.makeRpcCall(
      JSON.stringify(createRpcBatchObj(batchObj, notification)),
      Array.isArray(batchObj)
    )
  }

  async makeRpcCall(
    stringifiedRpcRequestObj: string,
    shouldReturnBatchResultsAsArray = true
  ) {
    const rpcResponseObj = await send(
      this.url,
      {
        ...this.fetchInit,
        body: stringifiedRpcRequestObj,
      },
      this.handleUnsuccessfulResponse
    )
    return Array.isArray(rpcResponseObj)
      ? shouldReturnBatchResultsAsArray
        ? rpcResponseObj.reduce((acc, el) => {
            if ("result" in el) acc.push(el.result)
            return acc
          }, [] as any[])
        : rpcResponseObj.reduce((acc, el) => {
            if (el.id !== null) {
              acc[el.id as string | number] =
                "result" in el ? el.result : el.error
              return acc
            } else {
              // id might be null
              if ("null" in acc)
                acc["null"].push("result" in el ? el.result : el.error)
              else acc["null"] = ["result" in el ? el.result : el.error]
              return acc
            }
          }, {} as any)
      : this.finishResponse(rpcResponseObj)
  }

  finishResponse(data: JsonRpcSuccess | JsonRpcFailure) {
    if (typeof data !== "object")
      return Promise.reject(
        new BadServerDataError("The sent back data is no object.", -32002)
      )
    if ("result" in data) {
      return data.result
    } else if (data.error) {
      const error = new BadServerDataError(data.error.message, data.error.code)
      // if error stack from server side has been transmitted, then use the server data:
      if (data.error.data) Object.assign(error, data.error.data)
      return Promise.reject(error)
    } else
      return Promise.reject(
        new BadServerDataError("Data or Error Object is not present.", -32002)
      )
  }
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

export { createRemote, send, createRpcRequestObj, createRpcBatchObj }
