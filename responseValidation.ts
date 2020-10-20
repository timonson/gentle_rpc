import type {
  JsonRpcFailure,
  JsonRpcResponseBasis,
  JsonRpcSuccess,
  JsonValue,
} from "./jsonRpc2Types.ts";

export class BadServerDataError extends Error {
  name: string;
  code: number;
  data?: unknown;
  constructor(message: string, errorCode: number, data?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.code = errorCode;
    this.data = data;
  }
}

export function validateJsonRpcBasis(data: any): data is JsonRpcResponseBasis {
  return (
    data?.jsonrpc === "2.0" &&
    (typeof data?.id === "number" ||
      typeof data?.id === "string" ||
      data?.id === null)
  );
}
export function validateJsonRpcSuccess(data: any): data is JsonRpcSuccess {
  return "result" in data;
}
export function validateJsonRpcFailure(data: any): data is JsonRpcFailure {
  return (
    typeof data?.error?.code === "number" &&
    typeof data?.error?.message === "string"
  );
}

export function validateRpcResponseObj(data: JsonValue): JsonValue {
  if (validateJsonRpcBasis(data)) {
    if (validateJsonRpcSuccess(data)) return data.result;
    else if (validateJsonRpcFailure(data)) {
      throw new BadServerDataError(
        data.error.message,
        data.error.code,
        data.error.data,
      );
    }
  }
  throw new BadServerDataError(
    "Received data is no RPC response object.",
    -32003,
  );
}
