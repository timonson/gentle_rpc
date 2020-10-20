import { createRpcRequestObj } from "./rpcClient.ts";
import {
  BadServerDataError,
  validateRpcResponseObj,
} from "./responseValidation.ts";
import { isObject } from "./requestValidation.ts";

import type {
  JsonRpcBatchRequest,
  JsonRpcId,
  JsonRpcParams,
  JsonValue,
} from "./jsonRpc2Types.ts";

export type BatchInput = BatchArrayInput | BatchObjectInput;
export type BatchArrayInput = [string, JsonRpcParams?][];
export type BatchObjectInput = Record<string, [string, JsonRpcParams?]>;
export type BatchOutput = BatchArrayOutput | BatchObjectOutput;
type BatchArrayOutput = JsonValue[];
type BatchObjectOutput = Record<string, JsonValue>;

export function createRpcBatchObj(
  batchObj: BatchInput,
  id?: JsonRpcId,
): JsonRpcBatchRequest {
  return Array.isArray(batchObj)
    ? batchObj.map((el) => createRpcRequestObj(el[0], el[1], id))
    : Object.entries(batchObj).map(([key, value]) =>
      createRpcRequestObj(value[0], value[1], key)
    );
}

export function processBatchArray(
  rpcResponseBatch: JsonValue[],
): BatchArrayOutput {
  return rpcResponseBatch.map((rpcResponse) =>
    validateRpcResponseObj(rpcResponse)
  );
}

export function processBatchObject(
  rpcResponseBatch: JsonValue[],
): BatchObjectOutput {
  const validatedBatch = rpcResponseBatch.map((rpcResponse) =>
    validateRpcResponseObj(rpcResponse)
  );
  if (
    rpcResponseBatch.find(
      (rpcResponse) => typeof (rpcResponse as any)?.id !== "string",
    )
  ) {
    throw new BadServerDataError(
      "Returned id must be a string in batch objects.",
      32005,
    );
  } else {
    return rpcResponseBatch.reduce<BatchObjectOutput>(
      (acc, rpcResponse: any) => {
        const validatedRpcResponse = validateRpcResponseObj(rpcResponse);
        acc[rpcResponse.id] = validatedRpcResponse as JsonValue;
        return acc;
      },
      {},
    );
  }
}

export async function processBatch(
  batchObj: BatchInput,
  rpcResponse: JsonValue[],
) {
  try {
    const result = Array.isArray(batchObj)
      ? processBatchArray(rpcResponse)
      : processBatchObject(rpcResponse);
    if (
      batchObj !== null &&
      typeof batchObj === "object" &&
      Array.isArray(batchObj) === false
    ) {
      if (
        !isObject(result) ||
        Object.keys(batchObj).length !== Object.keys(result).length
      ) {
        return Promise.reject(
          new BadServerDataError(
            "Batch objects don't allow notifications and an unequal value was received.",
            -32006,
          ),
        );
      } else return result;
    }
    if (
      (Array.isArray(result) && result.length === batchObj.length) ||
      result === undefined
    ) {
      return result;
    } else {
      return Promise.reject(
        new BadServerDataError(
          "The returned batch array is not an equal object or undefined.",
          -32007,
        ),
      );
    }
  } catch (err) {
    return Promise.reject(err);
  }
}
