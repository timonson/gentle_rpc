/** A String specifying the version of the JSON-RPC protocol. MUST be exactly "2.0". */
export type JsonRpcVersion = "2.0"

/** Method names that begin with the word rpc followed by a period character
 * (U+002E or ASCII 46) are reserved for rpc-internal methods and extensions
 *  and MUST NOT be used for anything else. */
export type JsonRpcReservedMethod = string

/** An identifier established by the Client that MUST contain a String, Number,
 *  or NULL value if included. If it is not included it is assumed to be a
 *  notification. The value SHOULD normally not be Null and Numbers SHOULD
 *  NOT contain fractional parts [2] */
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
  /** Must be an integer */
  code: number
  message: string
  data?: any
}

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonObject | JsonArray
export type JsonObject = { [member: string]: JsonValue }
export type JsonArray = JsonValue[]
