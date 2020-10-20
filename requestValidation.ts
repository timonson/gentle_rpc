import { Methods } from "./rpcServer.ts";
import type {
  JsonArray,
  JsonObject,
  JsonRpcId,
  JsonRpcMethod,
  JsonRpcRequest,
  JsonValue,
} from "./jsonRpc2Types.ts";

export type ValidationSuccess = {
  id: JsonRpcId;
  method: JsonRpcMethod;
  params: JsonArray | JsonObject | undefined;
  result?: JsonValue;
  isError: undefined;
};
export type ValidationFailure = {
  id: JsonRpcId;
  message: string;
  code: number;
  isError: true;
};
export type ValidationObject = ValidationSuccess | ValidationFailure;

function isJsonRpcVersion(input: unknown): input is "2.0" {
  return input === "2.0";
}

function isJsonRpcMethod(input: unknown): input is string {
  return typeof input === "string" && !input.startsWith("rpc.");
}

function isJsonRpcParams(input: unknown): input is JsonArray | JsonObject {
  return typeof input === "object" && input !== null;
}

function isJsonRpcId(input: unknown): input is JsonRpcId {
  switch (typeof input) {
    case "string":
      return true;
    case "number":
      return input % 1 === 0;
    case "object":
      // Use of null ID in JSONRPC 2.0 is discouraged
      return input === null;
    default:
      return false;
  }
}

export function isObject(obj: unknown): obj is Record<string, any> {
  return (
    obj !== null && typeof obj === "object" && Array.isArray(obj) === false
  );
}

export function validateRpcRequestObject(
  decodedBody: any,
  methods: Methods,
): ValidationObject {
  if (decodedBody instanceof SyntaxError) {
    return {
      code: -32700,
      message: "Parse error",
      id: null,
      isError: true,
    };
  }

  if (isObject(decodedBody)) {
    if (
      !isJsonRpcVersion(decodedBody.jsonrpc) ||
      !isJsonRpcMethod(decodedBody.method) ||
      ("id" in decodedBody && !isJsonRpcId(decodedBody.id))
    ) {
      return {
        code: -32600,
        message: "Invalid Request",
        id: isJsonRpcId(decodedBody.id) ? decodedBody.id : null,
        isError: true,
      };
    } else if (typeof methods[decodedBody.method] !== "function") {
      return {
        code: -32601,
        message: "Method not found",
        id: decodedBody.id,
        isError: true,
      };
    } else if (
      "params" in decodedBody &&
      !isJsonRpcParams(decodedBody.params)
    ) {
      return {
        code: -32602,
        message: "Invalid parameters",
        id: decodedBody.id,
        isError: true,
      };
    } else {
      return decodedBody as ValidationSuccess;
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
