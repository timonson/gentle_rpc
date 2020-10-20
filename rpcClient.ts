import {
  BadServerDataError,
  validateJsonRpcBasis,
  validateRpcResponseObj,
} from "./responseValidation.ts";
import { isObject } from "./requestValidation.ts";
import { createRpcBatchObj, processBatch } from "./batchRequest.ts";

import type {
  JsonRpcBatchRequest,
  JsonRpcId,
  JsonRpcMethod,
  JsonRpcParams,
  JsonRpcRequest,
  JsonRpcSuccess,
  JsonValue,
} from "./jsonRpc2Types.ts";
import type {
  BatchArrayInput,
  BatchInput,
  BatchObjectInput,
} from "./batchRequest.ts";

type Resource = string | URL | Request;
type Options = RequestInit & {
  isNotification?: boolean;
  id?: JsonRpcId;
};
export type RequestResult = JsonValue | undefined;

function send(
  resource: Resource,
  fetchInit: RequestInit,
): Promise<JsonValue | undefined> {
  return fetch(resource, fetchInit).then((res: Response) => {
    if (res.ok) {
      return res
        .json()
        .catch((err) =>
          Promise.reject(new BadServerDataError(err.message, -32001))
        );
    } else {
      return Promise.reject(
        new BadServerDataError(`${res.status} ${res.statusText}`, -32002),
      );
    }
  });
}

export function createRpcRequestObj(
  methodName: string,
  params?: JsonRpcParams,
  id?: JsonRpcId,
): JsonRpcRequest {
  const rpcRequestObj: JsonRpcRequest = {
    jsonrpc: "2.0",
    method: methodName,
  };
  if (params) rpcRequestObj.params = params;
  if (id !== undefined) rpcRequestObj.id = id;
  return rpcRequestObj;
}

function generateID(size: number): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
  for (var str = "", i = 0; i < size; i += 1) {
    str += chars[Math.floor(Math.random() * chars.length)];
  }
  return str;
}

export function createRemote(resource: Resource, options: Options = {}) {
  const handler = {
    get(client: Client, name: JsonRpcMethod) {
      if ((client as any)[name] !== undefined) {
        return client[name as keyof Client];
      } else {
        return (...args: JsonRpcParams[]) =>
          client.makeRpcCall(
            JSON.stringify(
              createRpcRequestObj(
                name,
                args,
                options.isNotification
                  ? undefined
                  : options.id || generateID(7),
              ),
            ),
          );
      }
    },
  };
  const client = new Client(resource, options);
  return new Proxy(client, handler);
}

class Client {
  private url: Resource;
  private fetchInit: RequestInit;
  private isNotification = false;
  [key: string]: any // necessary for es6 proxy
  constructor(url: Resource, options: Options = {}) {
    this.url = url;
    this.isNotification = options.isNotification || false;
    this.fetchInit = {
      ...options,
      method: "POST",
      headers: { ...options.headers, "Content-Type": "application/json" },
    };
  }

  async batch(batchObj: BatchArrayInput): Promise<JsonValue[] | undefined>;
  async batch(batchObj: BatchObjectInput): Promise<Record<string, JsonValue>>;
  async batch(batchObj: BatchInput): Promise<unknown> {
    const rpcResponse = await send(this.url, {
      ...this.fetchInit,
      body: JSON.stringify(
        createRpcBatchObj(
          batchObj,
          this.isNotification ? undefined : generateID(7),
        ),
      ),
    });
    if (Array.isArray(rpcResponse)) {
      if (isObject(batchObj) || Array.isArray(batchObj)) {
        return processBatch(batchObj, rpcResponse);
      } else if (Array.isArray(batchObj) && rpcResponse === undefined) {
        return rpcResponse;
      }
    }
    return Promise.reject(
      new BadServerDataError(
        "The server returned an unexpected batch response.",
        32004,
      ),
    );
  }

  async makeRpcCall(stringifiedRpcRequestObj: string): Promise<RequestResult> {
    const rpcResponse = await send(this.url, {
      ...this.fetchInit,
      body: stringifiedRpcRequestObj,
    });
    if (rpcResponse === undefined) return rpcResponse;
    try {
      return validateRpcResponseObj(rpcResponse);
    } catch (err) {
      return Promise.reject(err);
    }
  }
}
