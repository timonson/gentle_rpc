import { ServerMethods } from "./response.ts";
import type {
  JsonArray,
  JsonObject,
  JsonValue,
  RpcId,
  RpcMethod,
} from "../json_rpc_types.ts";

export type ValidationSuccess = {
  id: RpcId;
  method: RpcMethod;
  params: JsonArray | JsonObject | undefined;
  result?: JsonValue;
  isError: false;
};
export type ValidationFailure = {
  id: RpcId;
  message: string;
  code: number;
  data?: Error["stack"];
  isError: true;
  method?: undefined;
  params?: undefined;
  result?: undefined;
};
export type ValidationObject = ValidationSuccess | ValidationFailure;

function isRpcVersion(input: unknown): input is "2.0" {
  return input === "2.0";
}

function isRpcMethod(input: unknown): input is string {
  return typeof input === "string" && !input.startsWith("rpc.");
}

function isRpcParams(input: unknown): input is JsonArray | JsonObject {
  return typeof input === "object" && input !== null;
}

function isRpcId(input: unknown): input is RpcId {
  switch (typeof input) {
    case "string":
      return true;
    case "number":
      return input % 1 === 0;
    case "object":
      return input === null;
    default:
      return false;
  }
}

function isObject(obj: unknown): obj is Record<string, any> {
  return (
    obj !== null && typeof obj === "object" && Array.isArray(obj) === false
  );
}

function tryToParse(json: string) {
  try {
    return [JSON.parse(json), null];
  } catch {
    return [null, {
      code: -32700,
      message: "Parse error",
      id: null,
      isError: true,
    }];
  }
}

export function validateRequest(
  body: string,
  methods: ServerMethods,
): ValidationObject | ValidationObject[] {
  const [decodedBody, parsingError] = tryToParse(body);
  if (parsingError) return parsingError;
  if (Array.isArray(decodedBody) && decodedBody.length > 0) {
    return decodedBody.map((rpc) => validateRpcRequestObject(rpc, methods));
  } else {
    return validateRpcRequestObject(decodedBody, methods);
  }
}

export function validateRpcRequestObject(
  decodedBody: any,
  methods: ServerMethods,
): ValidationObject {
  if (isObject(decodedBody)) {
    if (
      !isRpcVersion(decodedBody.jsonrpc) ||
      !isRpcMethod(decodedBody.method) ||
      ("id" in decodedBody && !isRpcId(decodedBody.id))
    ) {
      return {
        code: -32600,
        message: "Invalid Request",
        id: isRpcId(decodedBody.id) ? decodedBody.id : null,
        isError: true,
      };
    } else if (typeof methods[decodedBody.method] !== "function") {
      return {
        code: -32601,
        message: "Method not found",
        id: decodedBody.id,
        isError: true,
      };
    } else if ("params" in decodedBody && !isRpcParams(decodedBody.params)) {
      return {
        code: -32602,
        message: "Invalid parameters",
        id: decodedBody.id,
        isError: true,
      };
    } else {
      return {
        id: decodedBody.id,
        method: decodedBody.method,
        params: decodedBody.params,
        isError: false,
      };
    }
  } else {
    return {
      code: -32600,
      message: "Invalid Request",
      id: null,
      isError: true,
    };
  }
}
