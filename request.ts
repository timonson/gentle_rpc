import { BadServerDataError, validateResponse } from "./validate_response.ts";
import { createRequest, createRequestBatch } from "./create_request.ts";

import type { JsonArray, JsonValue, RpcRequest } from "./json_rpc_types.ts";
import type { BatchArrayInput, BatchObjectInput } from "./create_request.ts";

type BatchArrayOutput = JsonArray;
type BatchObjectOutput = Record<string, JsonValue>;
type ClientMethods = {
  [method: string]: (
    args?: RpcRequest["params"],
  ) => Promise<JsonValue | undefined>;
};
type Resource = string | URL | Request;
type Options = RequestInit & {
  isNotification?: boolean;
  id?: RpcRequest["id"];
};

function send(
  resource: Resource,
  fetchInit: RequestInit,
): Promise<JsonValue | undefined> {
  return fetch(resource, fetchInit)
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
    .catch((err) => Promise.reject(new BadServerDataError(err.message, 32001)));
}

export function createRemote(resource: Resource, options: Options = {}) {
  const handler = {
    get(client: Client, name: RpcRequest["method"]) {
      if (client[name as keyof Client] !== undefined) {
        return client[name as keyof Client];
      } else {
        return (args?: RpcRequest["params"]) => client.request(name, args);
      }
    },
  };
  return new Proxy<ClientMethods>(new Client(resource, options), handler);
}

export function processBatchArray(
  rpcResponseBatch: JsonArray,
): BatchArrayOutput {
  return rpcResponseBatch.map((rpcResponse) => validateResponse(rpcResponse));
}

export function processBatchObject(
  rpcResponseBatch: JsonArray,
): BatchObjectOutput {
  return rpcResponseBatch.reduce<BatchObjectOutput>((acc, rpcResponse: any) => {
    acc[rpcResponse.id] = validateResponse(rpcResponse);
    return acc;
  }, {});
}

class Client {
  private url: Resource;
  private fetchInit: RequestInit;
  private isNotification = false;
  [key: string]: any // necessary for es6 proxy
  constructor(url: Resource, options: Options = {}) {
    this.url = url;
    options.isNotification && (this.isNotification = options.isNotification);
    this.fetchInit = {
      ...options,
      method: "POST",
      headers: { ...options.headers, "Content-Type": "application/json" },
    };
  }

  async batch(batchObj: BatchArrayInput): Promise<BatchArrayOutput | undefined>;
  async batch(
    batchObj: BatchObjectInput,
  ): Promise<BatchObjectOutput | undefined>;
  async batch(
    batchObj: BatchArrayInput | BatchObjectInput,
  ): Promise<BatchArrayOutput | BatchObjectOutput | undefined> {
    const rpcResponseBatch = await send(this.url, {
      ...this.fetchInit,
      body: JSON.stringify(createRequestBatch(batchObj, this.isNotification)),
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
          32004,
        );
      }
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async request(
    method: RpcRequest["method"],
    params: RpcRequest["params"],
  ): Promise<JsonValue | undefined> {
    const rpcResponse = await send(this.url, {
      ...this.fetchInit,
      body: JSON.stringify(
        createRequest({
          method,
          params,
          isNotification: this.isNotification,
          id: this.id,
        }),
      ),
    });

    try {
      return rpcResponse === undefined
        ? rpcResponse
        : validateResponse(rpcResponse);
    } catch (err) {
      return Promise.reject(err);
    }
  }
}
