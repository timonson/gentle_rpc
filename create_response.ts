import { validateRequest } from "./validate_request.ts";

import type {
  JsonArray,
  JsonValue,
  RpcBatchResponse,
  RpcResponse,
} from "./json_rpc_types.ts";
import type { ValidationObject } from "./validate_request.ts";
import type { ServerMethods } from "./respond.ts";

type RpcResponseOrNull = RpcResponse | null;
type RpcResponseOrBatchOrNull = RpcResponse | RpcBatchResponse | null;

async function executeMethods(
  obj: ValidationObject,
  methods: ServerMethods,
): Promise<ValidationObject> {
  if (obj.isError) return obj;
  try {
    return {
      ...obj,
      result: await methods[obj.method](obj.params),
    };
  } catch {
    return {
      code: -32603,
      message: "Internal error",
      id: obj.id,
      isError: true,
    };
  }
}

function addArgument(
  obj: ValidationObject,
  argument?: Record<string, any>,
): ValidationObject {
  if (obj.isError || argument === undefined) return obj;
  if (!obj.params) {
    obj.params = [argument];
  } else if (Array.isArray(obj.params)) {
    obj.params.push(argument);
  } else {
    obj.params = {
      ...obj.params,
      ...argument,
    };
  }
  return obj;
}

export async function createResponseBatch(
  maybeRpcBatchRequest: JsonArray,
  methods: ServerMethods,
  additionalArgument?: Record<string, any>,
): Promise<RpcResponseOrBatchOrNull> {
  const batchResponse = (
    await Promise.all(
      maybeRpcBatchRequest.map((maybeRpcRequest) =>
        createRpcResponseObject(maybeRpcRequest, methods, additionalArgument)
      ),
    )
  ).filter((obj: RpcResponseOrNull): obj is RpcResponse => obj !== null);
  return batchResponse.length > 0 ? batchResponse : null;
}

export async function createRpcResponseObject(
  maybeRpcRequest: JsonValue,
  methods: ServerMethods,
  additionalArgument?: Record<string, any>,
): Promise<RpcResponseOrNull> {
  const obj: ValidationObject = await executeMethods(
    addArgument(
      validateRequest(maybeRpcRequest, methods),
      additionalArgument,
    ),
    methods,
  );
  if (!obj.isError && obj.id !== undefined) {
    return {
      jsonrpc: "2.0",
      result: obj.result === undefined ? null : obj.result,
      id: obj.id,
    };
  } else if (obj.isError && obj.id !== undefined) {
    return {
      jsonrpc: "2.0",
      error: {
        code: obj.code,
        message: obj.message,
      },
      id: obj.id,
    };
  } else {
    return null;
  }
}
