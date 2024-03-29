import { BadServerDataError } from "./error.ts";

import type {
  JsonValue,
  RpcFailure,
  RpcNotification,
  RpcResponseBasis,
  RpcSuccess,
} from "../json_rpc_types.ts";

export function validateRpcNotification(data: any): data is RpcNotification {
  return (
    data?.jsonrpc === "2.0" &&
    typeof data.method === "string" &&
    typeof data.id === "undefined"
  );
}

function validateRpcBasis(data: any): data is RpcResponseBasis {
  return (
    data?.jsonrpc === "2.0" &&
    (typeof data.id === "number" ||
      typeof data.id === "string" ||
      data.id === null)
  );
}
function validateRpcSuccess(data: any): data is RpcSuccess {
  return "result" in data;
}
function validateRpcFailure(data: any): data is RpcFailure {
  return (
    typeof data?.error?.code === "number" &&
    typeof data.error.message === "string"
  );
}

export function validateResponse(
  data: unknown,
  isNotification?: boolean,
): RpcSuccess {
  if (isNotification && data !== undefined) {
    throw new BadServerDataError(
      null,
      "The server's response to the notification contains unexpected data.",
    );
  }
  if (validateRpcBasis(data)) {
    if (validateRpcSuccess(data)) return data;
    else if (validateRpcFailure(data)) {
      throw new BadServerDataError(
        data.id,
        data.error.message,
        data.error.code,
        data.error.data,
      );
    }
  }
  throw new BadServerDataError(
    null,
    "The received data is no valid JSON-RPC 2.0 Response object.",
  );
}
