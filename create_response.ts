import { validateRequest } from "./validate_request.ts";

import type {
  JsonArray,
  JsonValue,
  RpcBatchResponse,
  RpcResponse,
} from "./json_rpc_types.ts";
import type { ValidationObject } from "./validate_request.ts";
import type { RespondOptions, ServerMethods } from "./respond.ts";

type RpcResponseOrNull = RpcResponse | null;
type RpcResponseOrBatchOrNull = RpcResponse | RpcBatchResponse | null;

async function executeMethods(
  obj: ValidationObject,
  methods: ServerMethods,
  publicErrorStack?: RespondOptions["publicErrorStack"],
): Promise<ValidationObject> {
  if (obj.isError) return obj;
  try {
    return {
      ...obj,
      result: await methods[obj.method](obj.params),
    };
  } catch (err) {
    return {
      code: -32603,
      message: "Internal error",
      id: obj.id,
      data: publicErrorStack ? err.stack : undefined,
      isError: true,
    };
  }
}

function addArgument(
  obj: ValidationObject,
  { argument, methods = [], allMethods }: RespondOptions,
): ValidationObject {
  if (
    obj.isError ||
    argument === undefined ||
    (!methods.includes(obj.method) && !allMethods)
  ) {
    return obj;
  }

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
  options: RespondOptions,
): Promise<RpcResponseOrBatchOrNull> {
  const batchResponse = (
    await Promise.all(
      maybeRpcBatchRequest.map((maybeRpcRequest) =>
        createRpcResponseObject(maybeRpcRequest, methods, options)
      ),
    )
  ).filter((obj: RpcResponseOrNull): obj is RpcResponse => obj !== null);
  return batchResponse.length > 0 ? batchResponse : null;
}

export async function createRpcResponseObject(
  maybeRpcRequest: JsonValue,
  methods: ServerMethods,
  options: RespondOptions,
): Promise<RpcResponseOrNull> {
  const obj: ValidationObject = await executeMethods(
    addArgument(validateRequest(maybeRpcRequest, methods), options),
    methods,
    options.publicErrorStack,
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
        data: obj.data,
      },
      id: obj.id,
    };
  } else {
    return null;
  }
}
