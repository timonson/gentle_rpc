import type { RpcBatchRequest, RpcRequest } from "../json_rpc_types.ts";
import type { BatchArrayInput, BatchObjectInput } from "./http.ts";

function generateId() {
  return window.crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
}

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
  id = isNotification ? undefined : id !== undefined ? id : generateId();
  id !== undefined && (rpcRequest.id = id);
  return rpcRequest;
}

export function createRequestBatch(
  batchObj: BatchArrayInput | BatchObjectInput,
  isNotification = false,
): RpcBatchRequest {
  return Array.isArray(batchObj)
    ? batchObj.map((el) =>
      Object.entries(el).map(([method, arr]) =>
        arr.map((params) => createRequest({ method, params, isNotification }))
      )
    ).flat(2)
    : Object.entries(batchObj).map(([key, value]) =>
      createRequest({
        method: value[0],
        params: value[1],
        isNotification,
        id: key,
      })
    );
}
