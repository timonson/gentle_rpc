import { createRequest, createRequestBatch } from "./creation.ts";
import { validateResponse } from "./validation.ts";
import { BadServerDataError } from "./error.ts";

import type { Resource } from "./http_remote.ts";
import type { JsonArray, JsonValue, RpcRequest } from "../json_rpc_types.ts";
import type { BatchArrayInput, BatchObjectInput } from "./creation.ts";

type BatchArrayOutput = JsonArray;
type BatchObjectOutput = Record<string, JsonValue>;

function send(
  resource: Resource,
  fetchInit: RequestInit,
): Promise<JsonValue | undefined> {
  return fetch(
    resource instanceof URL ? resource.href : resource,
    fetchInit,
  )
    .then((res: Response) => {
      if (!res.ok) {
        return Promise.reject(
          new BadServerDataError(
            null,
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
      Promise.reject(new BadServerDataError(null, err.message, -32001))
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
  private fetchInit: Omit<RequestInit, "headers"> & { headers: Headers };
  [key: string]: any // necessary for es6 proxy
  constructor(
    resource: Resource,
    options: RequestInit = {},
  ) {
    const headers = options.headers === undefined
      ? new Headers()
      : options.headers instanceof Headers
      ? options.headers
      : new Headers(options.headers);
    headers.set("Content-Type", "application/json");
    this.fetchInit = {
      ...options,
      method: "POST",
      headers,
    };
    this.resource = resource;
  }

  batch(
    batchObj: BatchArrayInput,
    isNotification?: boolean,
  ): Promise<BatchArrayOutput | undefined>;
  batch(
    batchObj: BatchObjectInput,
  ): Promise<BatchObjectOutput | undefined>;
  batch(
    batchObj: BatchArrayInput | BatchObjectInput,
    isNotification?: boolean,
  ): Promise<BatchArrayOutput | BatchObjectOutput | undefined> {
    return send(this.resource, {
      ...this.fetchInit,
      body: JSON.stringify(
        createRequestBatch(batchObj, isNotification),
      ),
    }).then((rpcResponseBatch) => {
      if (rpcResponseBatch === undefined && isNotification) {
        return rpcResponseBatch;
      } else if (
        Array.isArray(rpcResponseBatch) && rpcResponseBatch.length > 0
      ) {
        return Array.isArray(batchObj)
          ? processBatchArray(rpcResponseBatch)
          : processBatchObject(rpcResponseBatch);
      } else {
        throw new BadServerDataError(
          null,
          "The server returned an invalid batch response.",
          -32004,
        );
      }
    });
  }

  call(
    method: RpcRequest["method"],
    params: RpcRequest["params"],
    { isNotification, jwt }: { isNotification?: boolean; jwt?: string } = {},
  ): Promise<JsonValue | undefined> {
    const rpcRequestObj = createRequest({
      method,
      params,
      isNotification,
    });
    return send(this.resource, {
      ...this.fetchInit,
      headers: jwt
        ? new Headers([
          ...this.fetchInit.headers.entries(),
          ["Authorization", `Bearer ${jwt}`],
        ])
        : this.fetchInit.headers,
      body: JSON.stringify(
        rpcRequestObj,
      ),
    }).then((rpcResponse) =>
      rpcResponse === undefined && isNotification
        ? undefined
        : validateResponse(rpcResponse).result
    );
  }
}
