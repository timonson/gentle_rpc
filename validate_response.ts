import type {
  JsonValue,
  RpcFailure,
  RpcResponseBasis,
  RpcSuccess,
} from "./json_rpc_types.ts";

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

function validateRpcBasis(data: any): data is RpcResponseBasis {
  return (
    data?.jsonrpc === "2.0" &&
    (typeof data?.id === "number" ||
      typeof data?.id === "string" ||
      data?.id === null)
  );
}
function validateRpcSuccess(data: any): data is RpcSuccess {
  return "result" in data;
}
function validateRpcFailure(data: any): data is RpcFailure {
  return (
    typeof data?.error?.code === "number" &&
    typeof data?.error?.message === "string"
  );
}

export function validateResponse(data: JsonValue): JsonValue {
  if (validateRpcBasis(data)) {
    if (validateRpcSuccess(data)) return data.result;
    else if (validateRpcFailure(data)) {
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
