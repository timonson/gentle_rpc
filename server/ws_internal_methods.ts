import { createResponseObject } from "./creation.ts";
import { validateRequest, validateRpcRequestObject } from "./validation.ts";

import type { CreationInput } from "./creation.ts";
import type { ValidationObject } from "./validation.ts";
import type { RpcId, RpcMethod, RpcParams } from "../json_rpc_types.ts";
import type { WebSocket } from "./deps.ts";
import type { ServerMethods } from "./response.ts";

export type Input = CreationInput & { socket: WebSocket };
type SubscriptionMap = Map<WebSocket, { id: RpcId; method: RpcMethod }[]>;

export const subscriptionMap: SubscriptionMap = new Map();

export const internalMethods: ServerMethods = {
  subscribe: ({ socket, validationObject, methods, options }: Input) => {
    if (isInternalMethodRpc(validationObject)) {
      const subscriptions = subscriptionMap.get(socket);
      if (subscriptions) {
        subscriptions.push(
          { id: validationObject.id, method: validationObject.params.method },
        );
      } else {
        subscriptionMap.set(
          socket,
          [{
            id: validationObject.id,
            method: validationObject.params.method,
          }],
        );
      }
      return { event: "subscribed", id: validationObject.id };
    } else {
      throw new Error("The method 'subscribe' is a special method.");
    }
  },

  unsubscribe: ({ socket, validationObject, methods, options }: Input) => {
    if (isInternalMethodRpc(validationObject)) {
      const subscriptions = subscriptionMap.get(socket);
      if (subscriptions) {
        const unsubscriberIdAndMethod = subscriptions.find((
          methodAndId,
        ) => (typeof validationObject.params.id === "string" &&
          methodAndId.method === validationObject.params.method &&
          methodAndId.id === validationObject.params.id)
        );
        if (unsubscriberIdAndMethod) {
          const methodsAndIdsList = subscriptions.filter((methodAndId) =>
            methodAndId !== unsubscriberIdAndMethod
          );
          if (methodsAndIdsList.length === 0) {
            subscriptionMap.delete(socket);
          } else {
            subscriptionMap.set(socket, methodsAndIdsList);
          }
          return { event: "unsubscribed", id: unsubscriberIdAndMethod.id };
        } else {
          throw new Error("No matching id or method for unsubscription.");
        }
      } else throw new Error("No matching socket for unsubscription.");
    } else {
      throw new Error("The method 'unsubscribe' is a special method.");
    }
  },

  emit: async ({ socket, validationObject, methods, options }: Input) => {
    if (isInternalMethodRpc(validationObject)) {
      const responses = await Promise.all(
        [...subscriptionMap.entries()].map(([socket, methodsAndIdsList]) =>
          methodsAndIdsList.filter(({ id, method }) =>
            method === validationObject.params.method
          ).map(async ({ id, method }) => {
            const response = await createResponseObject({
              validationObject: validateRpcRequestObject({
                id,
                method,
                params: validationObject.params.params,
                jsonrpc: "2.0",
              }, methods),
              methods,
              options,
            });
            try {
              await socket.send(JSON.stringify(response));
              return response;
            } catch (err) {
              if (err instanceof Deno.errors.ConnectionReset) {
                subscriptionMap.delete(socket);
                return response;
              } else {
                throw new Error(
                  "An error occured while emitting data" + err.message,
                );
              }
            }
          })
        ).flat(1),
      );
      const emitterMethodAndId = subscriptionMap.get(socket)?.find((
        methodAndId,
      ) => (typeof validationObject.params.id === "string" &&
        methodAndId.method === validationObject.params.method &&
        methodAndId.id === validationObject.params.id)
      );
      if (responses && emitterMethodAndId?.id) {
        return { event: "emitted", id: emitterMethodAndId.id };
      } else {
        throw new Error("An error occured while emitting data.");
      }
    } else {
      throw new Error("The method 'emit' is a special method.");
    }
  },
};

function isInternalMethodRpc(
  validationObject: ValidationObject,
): validationObject is ValidationObject & {
  params: { method: string; params?: RpcParams; id?: string };
} {
  return validationObject.params !== undefined &&
    !Array.isArray(validationObject.params) &&
    typeof validationObject.params.method === "string" &&
    (validationObject.params.params === undefined ||
      typeof validationObject.params.params === "object" &&
        validationObject.params.params !== null) &&
    (validationObject.params.id === undefined ||
      typeof validationObject.params.id === "string");
}

export function makeInternalMethodsOptionsMaybe(
  input: Input,
): Input {
  return input.validationObject.method === "emit" ||
      input.validationObject.method === "subscribe" ||
      input.validationObject.method === "unsubscribe"
    ? {
      ...input,
      options: {
        argument: input,
        methods: ["emit", "subscribe", "unsubscribe"],
      },
    }
    : input;
}
