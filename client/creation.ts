import { v4 } from "../deps.ts";

import type { RpcBatchRequest, RpcRequest } from "../json_rpc_types.ts";

export type BatchArrayInput = [string, ...RpcRequest["params"][]];
export type BatchObjectInput = Record<string, [string, RpcRequest["params"]?]>;

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
  id = isNotification ? undefined : id !== undefined ? id : v4.generate();
  id !== undefined && (rpcRequest.id = id);
  return rpcRequest;
}

export function createRequestBatch(
  batchObj: BatchArrayInput | BatchObjectInput,
  isNotification = false,
): RpcBatchRequest {
  return Array.isArray(batchObj)
    ? batchObj
      .map((el, _, array) =>
        createRequest({
          method: array[0] as string,
          params: el as RpcRequest["params"],
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
