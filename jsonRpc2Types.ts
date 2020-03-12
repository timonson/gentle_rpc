// https://www.jsonrpc.org/specification
export type JsonRpcVersion = "2.0"
export type JsonRpcReservedMethod = string
export type JsonRpcId = number | string | null
export type JsonRpcParams = JsonArray | JsonObject
export type JsonRpcMethod = string

export interface JsonRpcRequest {
  jsonrpc: JsonRpcVersion
  method: JsonRpcMethod
  id?: JsonRpcId
  params?: JsonArray | JsonObject
}

export type JsonRpcBatchRequest = JsonRpcRequest[]
export type JsonRpcBatchResponse = JsonRpcResponse[]

export type JsonRpcResponse = JsonRpcSuccess | JsonRpcFailure

export interface JsonRpcResponseBasis {
  jsonrpc: JsonRpcVersion
  id: JsonRpcId
}

export interface JsonRpcSuccess extends JsonRpcResponseBasis {
  result: any
}

export interface JsonRpcFailure extends JsonRpcResponseBasis {
  error: JsonRpcError
}

export interface JsonRpcError {
  code: number
  message: string
  data?: any
}

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonObject | JsonArray
export type JsonObject = { [member: string]: JsonValue }
export type JsonArray = JsonValue[]
