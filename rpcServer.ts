import { isObject, validateRpcRequestObject } from "./requestValidation.ts";

import type {
  ValidationObject,
  ValidationSuccess,
} from "./requestValidation.ts";
import type { ServerRequest } from "https://deno.land/std/http/server.ts";
import type {
  JsonRpcBatchResponse,
  JsonRpcResponse,
  JsonRpcResponseOrBatch,
  JsonValue,
} from "./jsonRpc2Types.ts";

export type Methods = { [method: string]: (...args: any[]) => unknown };
type ValidationObjectRequired = Required<ValidationObject>;
type JsonRpcResponseOrNull = JsonRpcResponse | null;
type JsonRpcResponseOrBatchOrNull =
  | JsonRpcResponse
  | JsonRpcBatchResponse
  | null;

function tryToParseJson(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch (err) {
    return err;
  }
}

async function setResultProperty(
  obj: ValidationObject,
  methods: Methods,
): Promise<ValidationObjectRequired> {
  if (obj.isError) return obj;
  else {
    try {
      const result = Array.isArray(obj.params)
        ? await methods[obj.method](...obj.params)
        : await methods[obj.method](obj.params);
      return {
        ...obj,
        // All results will be JSON.stringified().
        result: result === undefined ? null : (result as JsonValue),
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
}

function createRpcResponseObject(
  obj: ValidationObjectRequired,
): JsonRpcResponseOrNull {
  if (!obj.isError && obj.id !== undefined) {
    return {
      jsonrpc: "2.0",
      result: obj.result,
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

function createRpcResponse(
  obj: ValidationObjectRequired | ValidationObjectRequired[],
): JsonRpcResponseOrBatchOrNull {
  if (Array.isArray(obj)) {
    const batchResponse = obj
      .map((obj) => createRpcResponseObject(obj))
      .filter(
        (obj: JsonRpcResponseOrNull): obj is JsonRpcResponse => obj != null,
      );
    return batchResponse.length > 0 ? batchResponse : null;
  } else {
    return createRpcResponseObject(obj);
  }
}

function addAdditionalArgument(
  obj: ValidationObject,
  argument: any,
): ValidationObject {
  if (obj.isError || argument === undefined) return obj;
  if (!obj.params) {
    obj.params = [argument];
  } else if (Array.isArray(obj.params)) {
    obj.params.push(argument);
  } else if (isObject(argument)) {
    obj.params = {
      ...obj.params,
      ...argument,
    };
  }
  return obj;
}

export async function handleData(
  decodedBody: string,
  methods: Methods,
  { additionalArgument }: { additionalArgument?: any } = {},
): Promise<JsonRpcResponseOrBatchOrNull> {
  const data = tryToParseJson(decodedBody);
  const validationObjectRequired = Array.isArray(data) && data.length > 0
    ? await Promise.all(
      data
        .map((body) => validateRpcRequestObject(body, methods))
        .map((validationObject) =>
          addAdditionalArgument(validationObject, additionalArgument)
        )
        .map((validationObject) =>
          setResultProperty(validationObject, methods)
        ),
    )
    : await setResultProperty(
      addAdditionalArgument(
        validateRpcRequestObject(data, methods),
        additionalArgument,
      ),
      methods,
    );

  return createRpcResponse(validationObjectRequired);
}

export async function respondRpc(req: ServerRequest, methods: Methods) {
  const decodedBody = new TextDecoder().decode(await Deno.readAll(req.body));
  const jsonRpcResponseOrNull = await handleData(decodedBody, methods);
  const headers = new Headers();
  headers.set("content-type", "application/json");
  req.respond(
    jsonRpcResponseOrNull
      ? {
        body: new TextEncoder().encode(JSON.stringify(jsonRpcResponseOrNull)),
        headers,
        status: 200,
      }
      : { status: 204 },
  );
  return jsonRpcResponseOrNull;
}
