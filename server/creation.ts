import type {
  RpcBatchResponse,
  RpcError,
  RpcResponse,
  RpcSuccess,
} from "../json_rpc_types.ts";
import type { ValidationObject } from "./validation.ts";
import type { RespondOptions, ServerMethods } from "./response.ts";

export type CreationInput = {
  validationObject: ValidationObject;
  methods: ServerMethods;
  options: Required<RespondOptions>;
};
type RpcResponseOrNull = RpcResponse | null;
type BatchResponseOrNull = RpcBatchResponse | null;

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
  { additionalArguments }: Required<RespondOptions>,
): ValidationObject {
  if (obj.isError || additionalArguments.length === 0) {
    return obj;
  }

  const args = additionalArguments.filter((item) =>
    item.allMethods || item.methods?.includes(obj.method)
  ).reduce((acc, item) => ({ ...acc, ...item.arg }), {});

  obj.params = {
    ...obj.params,
    ...args,
  };

  return obj;
}

export async function cleanBatch(
  batch: Promise<RpcResponseOrNull>[],
): Promise<BatchResponseOrNull> {
  const batchResponse = (await Promise.all(batch)).filter((
    obj: RpcResponseOrNull,
  ): obj is RpcResponse => obj !== null);
  return batchResponse.length > 0 ? batchResponse : null;
}

export async function createResponseObject(
  { validationObject, methods, options }: CreationInput,
): Promise<RpcResponseOrNull> {
  const obj: ValidationObject = await executeMethods(
    addArgument(validationObject, options),
    methods,
    options.publicErrorStack,
  );

  if (!obj.isError && obj.id !== undefined) {
    return createRpcResponseObject({
      result: obj.result === undefined ? null : obj.result,
      id: obj.id,
    });
  } else if (obj.isError && obj.id !== undefined) {
    return createRpcResponseObject({
      code: obj.code,
      message: obj.message,
      data: obj.data,
      id: obj.id,
    });
  } else {
    return null;
  }
}

export function createRpcResponseObject(
  obj:
    | Omit<RpcSuccess, "jsonrpc">
    | (RpcError & { id: RpcSuccess["id"] }),
): RpcResponse {
  return "result" in obj && !("code" in obj)
    ? {
      jsonrpc: "2.0",
      result: obj.result,
      id: obj.id,
    }
    : {
      jsonrpc: "2.0",
      error: {
        code: obj.code,
        message: obj.message,
        data: obj.data,
      },
      id: obj.id,
    };
}
