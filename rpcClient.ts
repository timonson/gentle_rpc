import type {
  JsonRpcRequest,
  JsonRpcBatchRequest,
  JsonRpcResponse,
  JsonRpcBatchResponse,
  JsonRpcResponseBasis,
  JsonRpcSuccess,
  JsonRpcFailure,
  JsonRpcParams,
  JsonRpcMethod,
  JsonRpcId,
  JsonValue,
} from "./jsonRpc2Types.ts";

type Resource = string | URL | Request;
type Options = RequestInit & {
  isNotification?: boolean;
  id?: JsonRpcId;
  handleUnsuccessfulResponse?: (res: Response) => unknown;
};
type BatchArrayOutput = (JsonValue | BadServerDataError)[];
type BatchObjectOutput = Record<string, JsonValue | BadServerDataError>;
type BatchOutput = BatchArrayOutput | BatchObjectOutput;
type BatchArrayInput = [string, JsonRpcParams?][];
type BatchObjectInput = Record<string, [string, JsonRpcParams?]>;
type BatchInput = BatchArrayInput | BatchObjectInput;

class BadServerDataError extends Error {
  name: string;
  code: number;
  data?: unknown;
  constructor(message: string, errorCode: number, data?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.code = errorCode;
    this.data = data;
  }
}

function send(
  resource: Resource,
  fetchInit: RequestInit,
  handleUnsuccessfulResponse?: (res: Response) => unknown,
) {
  return fetch(resource, fetchInit)
    .then((res: Response) => {
      if (res.ok) {
        // check if rpc was a notification
        return res.text().then((text) => (text ? JSON.parse(text) : undefined));
      } else if (handleUnsuccessfulResponse) {
        return handleUnsuccessfulResponse(res);
      } else {
        return Promise.reject(
          new BadServerDataError(`${res.status} ${res.statusText}`, -32001),
        );
      }
    })
    .catch((err) =>
      Promise.reject(new BadServerDataError(err.message, -32002))
    );
}

function createRpcRequestObj(
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
  if (id === null) throw new TypeError("Setting the id to null is not allowed");
  return rpcRequestObj;
}

function createRpcBatchObj(
  batchObj: BatchInput,
  isNotification = false,
): JsonRpcBatchRequest {
  return Array.isArray(batchObj)
    ? batchObj.map((el) =>
      createRpcRequestObj(
        el[0],
        el[1],
        isNotification ? undefined : generateID(),
      )
    )
    : Object.entries(batchObj).map(([key, value]) =>
      createRpcRequestObj(value[0], value[1], key)
    );
}

function generateID(size = 7): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
  for (var str = "", i = 0; i < size; i += 1) {
    str += chars[Math.floor(Math.random() * chars.length)];
  }
  return str;
}

function createRemote(resource: Resource, options: Options = {}) {
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
                options.isNotification ? undefined : options.id || generateID(),
              ),
            ),
          );
      }
    },
  };
  const client = new Client(
    resource,
    options,
    options.handleUnsuccessfulResponse,
  );
  return new Proxy(client, handler);
}

class Client {
  private url: Resource;
  private fetchInit: RequestInit;
  private isNotification = false;
  private handleUnsuccessfulResponse?: (res: Response) => unknown;
  [key: string]: any // necessary for es6 proxy
  constructor(
    url: Resource,
    options: Options = {},
    handleUnsuccessfulResponse?: (res: Response) => unknown,
  ) {
    this.url = url;
    this.isNotification = options.isNotification || false;
    this.handleUnsuccessfulResponse = handleUnsuccessfulResponse;
    this.fetchInit = {
      ...options,
      method: "POST",
      headers: { ...options.headers, "Content-Type": "application/json" },
    };
  }

  async batch(batchObj: BatchArrayInput): Promise<JsonValue[]>;
  async batch(batchObj: BatchObjectInput): Promise<Record<string, JsonValue>>;
  async batch(batchObj: BatchInput): Promise<unknown> {
    if (Array.isArray(batchObj)) {
      const result = (await this.makeRpcCall(
        JSON.stringify(createRpcBatchObj(batchObj, this.isNotification)),
        Array.isArray(batchObj),
      )) as BatchArrayOutput | undefined;
      if (result instanceof BadServerDataError) return Promise.reject(result);
      else if (result === undefined || batchObj.length !== result.length) {
        return Promise.reject(
          new BadServerDataError("Something went wrong", -32004, result),
        );
      } else if (result.find((el) => el instanceof BadServerDataError)) {
        return Promise.reject(
          result.find((el) => el instanceof BadServerDataError),
        );
      } else return result;
    } else {
      const result = (await this.makeRpcCall(
        JSON.stringify(createRpcBatchObj(batchObj, this.isNotification)),
        Array.isArray(batchObj),
      )) as BatchObjectOutput | undefined;
      if (result instanceof BadServerDataError) return Promise.reject(result);
      else if (
        result === undefined ||
        Object.keys(batchObj).length !== Object.keys(result).length
      ) {
        return Promise.reject(
          new BadServerDataError("Something went wrong", -32004, result),
        );
      } else if (
        Object.values(result).find((el) => el instanceof BadServerDataError)
      ) {
        return Promise.reject(
          Object.values(result).find((el) => el instanceof BadServerDataError),
        );
      } else return result;
    }
  }

  async makeRpcCall(
    stringifiedRpcRequestObj: string,
    shouldReturnBatchResultsAsArray = true,
  ): Promise<JsonValue | BadServerDataError | BatchOutput | undefined> {
    const rpcResponse = (await send(
      this.url,
      {
        ...this.fetchInit,
        body: stringifiedRpcRequestObj,
      },
      this.handleUnsuccessfulResponse,
    )) as JsonValue | undefined;
    const result = rpcResponse === undefined
      ? undefined
      : this.handleResponseData(rpcResponse, shouldReturnBatchResultsAsArray);
    return result instanceof BadServerDataError
      ? Promise.reject(result)
      : result;
  }

  // public for tests
  handleResponseData(
    rpcResponseObjOrBatch: JsonValue,
    shouldReturnBatchResultsAsArray = true,
  ): JsonValue | BadServerDataError | BatchOutput {
    if (Array.isArray(rpcResponseObjOrBatch)) {
      return shouldReturnBatchResultsAsArray
        ? this.returnBatchAsArray(rpcResponseObjOrBatch)
        : this.returnBatchAsObject(rpcResponseObjOrBatch);
    } else {
      return this.validateRpcResponseObj(rpcResponseObjOrBatch);
    }
  }

  private returnBatchAsArray(rpcResponseBatch: JsonValue[]): BatchArrayOutput {
    return rpcResponseBatch.reduce<(JsonValue | BadServerDataError)[]>(
      (acc, rpcResponseObj) => {
        acc.push(this.validateRpcResponseObj(rpcResponseObj));
        return acc;
      },
      [],
    );
  }

  private returnBatchAsObject(
    rpcResponseBatch: JsonValue[],
  ): BatchObjectOutput {
    return rpcResponseBatch.reduce<BatchObjectOutput>((acc, rpcResponseObj) => {
      if (
        this.validateJsonRpcBasis(rpcResponseObj) &&
        rpcResponseObj.id !== null
      ) {
        acc[rpcResponseObj.id] = this.validateRpcResponseObj(rpcResponseObj);
        return acc;
      } else {
        // id might be null if an error occured on server side
        acc["null"] = this.validateRpcResponseObj(rpcResponseObj);
        return acc;
      }
    }, {});
  }
  private isObject(obj: unknown): obj is object {
    return (
      obj !== null && typeof obj === "object" && Array.isArray(obj) === false
    );
  }

  private hasProperty<K extends string>(
    key: K,
    x: object,
  ): x is { [key in K]: unknown } {
    return key in x;
  }
  private validateJsonRpcBasis(data: unknown): data is JsonRpcResponseBasis {
    return (
      this.isObject(data) &&
      this.hasProperty("jsonrpc", data) &&
      data.jsonrpc === "2.0" &&
      this.hasProperty("id", data) &&
      (typeof data.id === "number" ||
        typeof data.id === "string" ||
        data.id === null)
    );
  }
  private validateJsonRpcSuccess(
    data: JsonRpcResponseBasis,
  ): data is JsonRpcSuccess {
    return this.hasProperty("result", data);
  }
  private validateJsonRpcFailure(
    data: JsonRpcResponseBasis,
  ): data is JsonRpcFailure {
    return (
      this.hasProperty("error", data) &&
      this.isObject(data.error) &&
      this.hasProperty("code", data.error) &&
      typeof data.error.code === "number" &&
      this.hasProperty("message", data.error) &&
      typeof data.error.message === "string"
    );
  }

  private validateRpcResponseObj(
    data: JsonValue,
  ): JsonValue | BadServerDataError {
    if (this.validateJsonRpcBasis(data)) {
      if (this.validateJsonRpcSuccess(data)) return data.result;
      else if (this.validateJsonRpcFailure(data)) {
        return new BadServerDataError(
          data.error.message,
          data.error.code,
          data.error.data,
        );
      }
    }
    return new BadServerDataError(
      "Received data is no RPC response object.",
      -32003,
    );
  }
}

export {
  createRemote,
  send,
  createRpcRequestObj,
  createRpcBatchObj,
  Client,
  BadServerDataError,
};
