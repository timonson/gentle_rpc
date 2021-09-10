import { createRequest, createRequestBatch } from "./creation.ts";
import { validateResponse } from "./validation.ts";
import { BadServerDataError } from "./error.ts";

import type { JsonArray, JsonValue, RpcRequest } from "../json_rpc_types.ts";

export type Resource = string | URL | Request;
export type BatchArrayInput = Record<string, RpcRequest["params"][]>[];
export type BatchObjectInput = Record<string, [string, RpcRequest["params"]?]>;
export type BatchArrayOutput = JsonArray;
export type BatchObjectOutput = Record<string, JsonValue>;

function send(
  resource: Resource,
  fetchInit: RequestInit,
): Promise<JsonValue | undefined> {
  return fetch(
    resource instanceof URL ? resource.href : resource,
    fetchInit,
  ).then((res: Response) => {
    if (!res.ok) {
      return Promise.reject(
        new RangeError(
          null,
          `The HTTP response status code is not in the range 200-299. ` +
            `Instead received ${res.status} '${res.statusText}'.`,
        ),
      );
    } else if (
      res.status === 204 || res.headers.get("content-length") === "0"
    ) {
      return undefined;
    } else {
      return res.json().catch((err) =>
        Promise.reject(new BadServerDataError(null, err.message))
      );
    }
  });
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
  return rpcResponseBatch.reduce<BatchObjectOutput>(
    (acc, rpcResponse: unknown) => {
      const rpcSuccess = validateResponse(rpcResponse);
      if (rpcSuccess.id !== null) {
        acc[rpcSuccess.id] = rpcSuccess.result;
        return acc;
      } else {
        throw new BadServerDataError(
          null,
          "Type 'null' cannot be used as an index type.",
        );
      }
    },
    {},
  );
}

export class Remote {
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
    options?: { isNotification?: false },
  ): Promise<BatchArrayOutput>;
  batch(
    batchObj: BatchArrayInput,
    options: { isNotification: true },
  ): Promise<undefined>;
  batch(
    batchObj: BatchObjectInput,
  ): Promise<BatchObjectOutput>;
  batch(
    batchObj: BatchArrayInput | BatchObjectInput,
    { isNotification }: { isNotification?: boolean } = {},
  ): Promise<
    BatchArrayOutput | BatchObjectOutput | undefined
  > {
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
        );
      }
    });
  }

  call(
    method: RpcRequest["method"],
    params?: RpcRequest["params"],
    options?: { isNotification?: false; jwt?: string },
  ): Promise<JsonValue>;
  call(
    method: RpcRequest["method"],
    params: RpcRequest["params"],
    options: { isNotification: true },
  ): Promise<undefined>;
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
