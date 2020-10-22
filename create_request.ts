import type {
  JsonArray,
  JsonObject,
  RpcBatchRequest,
  RpcParams,
  RpcRequest,
} from "./json_rpc_types.ts";

export type BatchArrayInput = [
  string,
  ...(JsonArray | JsonObject | undefined)[],
];
export type BatchObjectInput = Record<string, [string, RpcParams?]>;

export function createRequest({
  method,
  params,
  isNotification = false,
  id,
}: {
  method: string;
  params?: RpcRequest["params"];
  isNotification?: boolean;
  id?: RpcRequest["id"];
}): RpcRequest {
  const rpcRequest: RpcRequest = {
    jsonrpc: "2.0",
    method,
  };
  params && (rpcRequest.params = params);
  id = isNotification ? undefined : id !== undefined ? id : generateID(5);
  id !== undefined && (rpcRequest.id = id);
  return rpcRequest;
}

export function createRequestBatch(
  batchObj: BatchArrayInput | BatchObjectInput,
  isNotification = false,
): RpcBatchRequest {
  return Array.isArray(batchObj)
    ? batchObj
      // .slice(1)
      .map((el, _, array) =>
        createRequest({
          method: array[0] as string,
          params: el as RpcParams | undefined,
          isNotification,
        })
      )
      .slice(1)
    : Object.entries(batchObj).map(([key, value]) =>
      createRequest({
        method: value[0],
        params: value[1],
        isNotification,
        id: key,
      })
    );
}

function generateID(size: number): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
  for (var str = "", i = 0; i < size; i += 1) {
    str += chars[Math.floor(Math.random() * chars.length)];
  }
  return str;
}
