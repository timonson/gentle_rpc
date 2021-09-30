import { CustomError } from "./custom_error.ts";
import { verifyJwt } from "./auth.ts";

import type {
  JsonObject,
  RpcBatchResponse,
  RpcError,
  RpcResponse,
  RpcSuccess,
} from "../json_rpc_types.ts";
import type { ValidationObject } from "./validation.ts";
import type { Methods, Options } from "./response.ts";
import type { Payload } from "./deps.ts";

export type CreationInput = {
  validationObject: ValidationObject;
  methods: Methods;
  options: Required<Options>;
};
export type RpcResponseOrBatchOrNull =
  | RpcResponse
  | RpcBatchResponse
  | null;
type RpcResponseOrNull = RpcResponse | null;
type RpcBatchResponseOrNull = RpcBatchResponse | null;

async function executeMethods(
  obj: ValidationObject,
  methods: Methods,
  publicErrorStack?: Options["publicErrorStack"],
): Promise<ValidationObject> {
  if (obj.isError) return obj;
  try {
    return {
      ...obj,
      result: await methods[obj.method](obj.params),
    };
  } catch (err) {
    if (err instanceof CustomError) {
      return {
        code: err.code,
        message: err.message,
        id: obj.id,
        data: err.data,
        isError: true,
      };
    }
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
  { additionalArguments, publicErrorStack }: Required<Options>,
  jwtPayload?: Payload,
): ValidationObject {
  if (obj.isError) {
    return obj;
  }
  const args = additionalArguments.filter((item) =>
    item.allMethods || item.methods?.includes(obj.method)
  ).reduce((acc, item) => ({ ...acc, ...item.args }), {});
  if (Object.keys(args).length === 0 && !jwtPayload) {
    return obj;
  }
  if (Array.isArray(obj.params)) {
    return {
      code: -32010,
      message: "Server error",
      id: obj.id,
      data: publicErrorStack
        ? new Error("The method requires named parameters.").stack
        : undefined,
      isError: true,
    };
  }
  obj.params = {
    ...obj.params,
    ...args,
  };
  if (jwtPayload) obj.params.payload = jwtPayload as JsonObject;
  return obj;
}

export async function cleanBatch(
  batch: Promise<RpcResponseOrNull>[],
): Promise<RpcBatchResponseOrNull> {
  const batchResponse = (await Promise.all(batch)).filter((
    obj: RpcResponseOrNull,
  ): obj is RpcResponse => obj !== null);
  return batchResponse.length > 0 ? batchResponse : null;
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

export async function createRpcResponse(
  { validationObject, methods, options, jwtPayload }: CreationInput & {
    jwtPayload?: Payload;
  },
): Promise<RpcResponseOrNull> {
  const obj: ValidationObject = await executeMethods(
    addArgument(validationObject, options, jwtPayload),
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

export async function createRpcResponseOrBatch(
  validationObjectOrBatch: ValidationObject | ValidationObject[],
  methods: Methods,
  options: Required<Options>,
  authHeader: string | null,
): Promise<RpcResponseOrBatchOrNull> {
  return Array.isArray(validationObjectOrBatch)
    ? await cleanBatch(
      validationObjectOrBatch.map(async (validationObject) =>
        createRpcResponse(
          await verifyJwt({
            validationObject,
            methods,
            options,
            authHeader,
          }),
        )
      ),
    )
    : await createRpcResponse(
      await verifyJwt({
        validationObject: validationObjectOrBatch,
        methods,
        options,
        authHeader,
      }),
    );
}
