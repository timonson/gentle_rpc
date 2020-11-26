import { createRequest, createRequestBatch } from "./creation.ts";
import { validateResponse } from "./validation.ts";
import { BadServerDataError } from "./error.ts";

import type { Resource } from "./remote.ts";
import type { JsonArray, JsonValue, RpcRequest } from "../json_rpc_types.ts";
import type { BatchArrayInput, BatchObjectInput } from "./creation.ts";

type BatchArrayOutput = JsonArray;
type BatchObjectOutput = Record<string, JsonValue>;

function send(
  resource: Resource,
  fetchInit: RequestInit,
): Promise<JsonValue | undefined> {
  return fetch(
    resource,
    fetchInit,
  )
    .then((res: Response) => {
      if (!res.ok) {
        return Promise.reject(
          new BadServerDataError(
            `${res.status} '${res.statusText}' received instead of 200-299 range.`,
            -32002,
          ),
        );
      } else if (
        res.status === 204 ||
        res.headers.get("content-length") === "0"
      ) {
        return undefined;
      } else return res.json();
    })
    .catch((err) =>
      Promise.reject(new BadServerDataError(err.message, -32001))
    );
}

export function processBatchArray(
  rpcResponseBatch: JsonArray,
): BatchArrayOutput {
  return rpcResponseBatch.map((rpcResponse) =>
    validateResponse(rpcResponse).result
  );
}

export function processBatchObject(
  rpcResponseBatch: JsonArray,
): BatchObjectOutput {
  return rpcResponseBatch.reduce<BatchObjectOutput>((acc, rpcResponse: any) => {
    acc[rpcResponse.id] = validateResponse(rpcResponse).result;
    return acc;
  }, {});
}

export class Client {
  private resource: Resource;
  private fetchInit: RequestInit;
  [key: string]: any // necessary for es6 proxy
  constructor(resource: Resource, options: RequestInit = {}) {
    this.fetchInit = {
      ...options,
      method: "POST",
      headers: { ...options.headers, "Content-Type": "application/json" },
    };
    this.resource = resource;
  }

  async batch(
    batchObj: BatchArrayInput,
    isNotification?: boolean,
  ): Promise<BatchArrayOutput | undefined>;
  async batch(
    batchObj: BatchObjectInput,
  ): Promise<BatchObjectOutput | undefined>;
  async batch(
    batchObj: BatchArrayInput | BatchObjectInput,
    isNotification?: boolean,
  ): Promise<BatchArrayOutput | BatchObjectOutput | undefined> {
    const rpcResponseBatch = await send(this.resource, {
      ...this.fetchInit,
      body: JSON.stringify(
        createRequestBatch(batchObj, isNotification),
      ),
    });
    try {
      if (rpcResponseBatch === undefined) {
        return rpcResponseBatch;
      } else if (Array.isArray(rpcResponseBatch)) {
        return Array.isArray(batchObj)
          ? processBatchArray(rpcResponseBatch)
          : processBatchObject(rpcResponseBatch);
      } else {
        throw new BadServerDataError(
          "The server returned an invalid batch response.",
          -32004,
        );
      }
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async call(
    method: RpcRequest["method"],
    params: RpcRequest["params"],
    isNotification = false,
  ): Promise<JsonValue | undefined> {
    const rpcRequestObj = createRequest({
      method,
      params,
      isNotification,
    });
    const rpcResponse = await send(this.resource, {
      ...this.fetchInit,
      body: JSON.stringify(
        rpcRequestObj,
      ),
    });
    try {
      return rpcResponse === undefined
        ? undefined
        : validateResponse(rpcResponse).result;
    } catch (err) {
      return Promise.reject(err);
    }
  }
}
