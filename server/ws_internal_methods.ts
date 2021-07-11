import { isRpcParams } from "./validation.ts";

import type { ServerMethods } from "./response.ts";

export type MethodsAndIdsStore = Map<string, Set<string>>;

type SubscribeInput = {
  id: unknown;
  method: unknown;
  methodsAndIdsStore: MethodsAndIdsStore;
};

function isString(input: unknown): input is string {
  return typeof input === "string";
}

function subscribe({ id, method, methodsAndIdsStore }: SubscribeInput) {
  if (isString(id) && (isString(method))) {
    if (methodsAndIdsStore.has(method)) {
      methodsAndIdsStore.get(method)!.add(id);
    } else {
      methodsAndIdsStore.set(method, new Set([id]));
    }
    return { event: "subscribed", id, method };
  } else {
    throw new Error("Wrong arguments.");
  }
}

function unsubscribe({ id, method, methodsAndIdsStore }: SubscribeInput) {
  if (isString(id) && (isString(method))) {
    if (methodsAndIdsStore.has(method)) {
      methodsAndIdsStore.get(method)!.delete(id);
    }
    return { event: "unsubscribed", id, method };
  } else {
    throw new Error("Wrong arguments.");
  }
}

function emit(
  { id, method, params }: { id: unknown; method: unknown; params: unknown },
) {
  if (
    isString(id) && isString(method) &&
    (isRpcParams(params) || params === undefined)
  ) {
    dispatchEvent(
      new CustomEvent("emit", { detail: { method, params } }),
    );
    return {
      event: "emitted",
      id,
      method,
    };
  } else {
    throw new Error("Wrong arguments.");
  }
}

export const internalMethods: ServerMethods = { subscribe, unsubscribe, emit };
