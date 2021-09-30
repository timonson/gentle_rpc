import { createRpcResponseOrBatch } from "./creation.ts";
import { validateRequest, validateRpcRequestObject } from "./validation.ts";
import { isWebSocketCloseEvent } from "./deps.ts";

import type { CreationInput } from "./creation.ts";
import type { MethodsAndIdsStore } from "./ws_internal_methods.ts";

type Input = Omit<CreationInput, "validationObject"> & { socket: WebSocket };
type Emission = {
  method: string;
  params: unknown;
};

function partialEmitListener(
  { socket, methods, options }: Input,
  bearer: string | null,
) {
  return async function emitListener(event: CustomEvent) {
    const { method, params } = event.detail as Emission;
    const methodsAndIdsStore = options
      .additionalArguments.find((item) => item.args.methodsAndIdsStore)?.args
      .methodsAndIdsStore as MethodsAndIdsStore;
    if (methodsAndIdsStore?.has(method)) {
      const ids = [...methodsAndIdsStore.get(method)!.values()];
      return ids.map(async (id) => {
        const response = await createRpcResponseOrBatch(
          validateRpcRequestObject(
            params === undefined
              ? { method, id, jsonrpc: "2.0" }
              : { method, params, id, jsonrpc: "2.0" },
            methods,
          ),
          methods,
          options,
          bearer,
        );
        if (response) {
          try {
            return await socket.send(JSON.stringify(response));
          } catch {
            removeEventListener("emit", emitListener as EventListener);
          }
        }
      });
    }
  };
}

export async function handleWs(
  { socket, methods, options }: Input,
  jwtOrNull?: string | null,
) {
  const bearer = typeof jwtOrNull === "string" ? `Bearer ${jwtOrNull}` : null;
  let emitListenerOrNull: null | ((event: CustomEvent<any>) => void) = null;
  if (options.enableInternalMethods) {
    emitListenerOrNull = partialEmitListener({
      socket,
      methods,
      options,
    }, bearer);
    addEventListener("emit", emitListenerOrNull as EventListener);
  }
  socket.onopen = () => {
    // console.log("socket connected!");
  };
  socket.onmessage = async (ev) => {
    const validationObjectOrBatch = validateRequest(ev.data, methods);
    const rpcResponseOrBatchOrNull = await createRpcResponseOrBatch(
      validationObjectOrBatch,
      methods,
      options,
      bearer,
    );
    if (rpcResponseOrBatchOrNull) {
      socket.send(JSON.stringify(rpcResponseOrBatchOrNull));
    }
  };
  socket.onclose = () => {
    if (options.enableInternalMethods) {
      removeEventListener("emit", emitListenerOrNull as EventListener);
    }
    // console.log("WebSocket has been closed.");
  };
  socket.onerror = (ev) => {
    if (options.enableInternalMethods) {
      removeEventListener("emit", emitListenerOrNull as EventListener);
    }
    console.error("WebSocket error");
  };
}
