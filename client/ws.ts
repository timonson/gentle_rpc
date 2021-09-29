import { createRequest } from "./creation.ts";
import { validateResponse, validateRpcNotification } from "./validation.ts";
import { BadServerDataError } from "./error.ts";

import type { JsonObject, JsonValue, RpcRequest } from "../json_rpc_types.ts";

function isObject(obj: unknown): obj is Record<string, unknown> {
  return (
    obj !== null && typeof obj === "object" && Array.isArray(obj) === false
  );
}

export class Remote {
  private textDecoder?: TextDecoder;
  private payloadData!: Promise<JsonObject | null>;
  socket: WebSocket;
  [key: string]: any // necessary for es6 proxy
  constructor(
    socket: WebSocket,
  ) {
    this.socket = socket;
    this.getPayloadData(socket);
  }

  private async getPayloadData(socket: WebSocket): Promise<void> {
    this.payloadData = new Promise<JsonObject | null>((resolve, reject) => {
      socket.onmessage = async (event: MessageEvent) => {
        let msg: string;
        if (event.data instanceof Blob) {
          msg = this.getTextDecoder().decode(await event.data.arrayBuffer());
        } else if (event.data instanceof ArrayBuffer) {
          msg = this.getTextDecoder().decode(event.data);
        } else {
          msg = event.data;
        }

        let payload: JsonObject;
        try {
          payload = JSON.parse(msg) as JsonObject;
        } catch (error) {
          throw new BadServerDataError(
            null,
            `The server sent invalid JSON: ${error.message}`,
            null,
          );
        }

        resolve(payload);
        isResolved = true;
      };
      socket.onclose = () => resolve(null);
    });
    await this.payloadData;
    if (socket.readyState < 2) {
      this.getPayloadData(socket);
    }
  }

  private getTextDecoder(): TextDecoder {
    return this.textDecoder || (this.textDecoder = new TextDecoder());
  }

  private async *iterateRequests(
    rpcRequest: RpcRequest,
  ): AsyncGenerator<JsonValue> {
    while (this.socket.readyState < 2) {
      const payloadData = await this.payloadData;
      if (payloadData === null) {
        break;
      }

      // Batch emits are handled by the subscription iterator
      if (Array.isArray(payloadData)) continue;

      // Ignore non-responses
      if (payloadData.id !== rpcRequest.id) continue;

      const rpcResponse = validateResponse(payloadData);
      yield rpcResponse.result;
      break;
    }
  }

  private async *iterateSubscriptions(
    rpcRequest: RpcRequest,
  ): AsyncGenerator<JsonValue> {
    while (this.socket.readyState < 2) {
      try {
        const payloadData = await this.payloadData;
        if (payloadData === null) {
          break;
        }

        // Process for the method 'emitBatch':
        if (Array.isArray(payloadData) && payloadData.length > 0) {
          const rpcResponses = payloadData.map(validateResponse);
          const invalid = rpcResponses.find((res) =>
            !isObject(res.result) || res.result.event !== "emitted"
          );
          if (invalid) {
            throw new BadServerDataError(
              invalid.id || null,
              "The server returned an invalid batch response.",
              -32004,
            );
          } else {
            for (const res of rpcResponses) {
              if ((res.result as JsonObject).id === rpcRequest.id) {
                yield res.result;
              }
            }
          }
        } else {
          const rpcResponse = validateResponse(payloadData);
          if (
            isObject(rpcResponse.result) &&
            rpcResponse.result.id === rpcRequest.id
          ) {
            switch (rpcResponse.result.event) {
              case "subscribed":
                continue;
              case "unsubscribed":
                break;
              case "emitted":
                yield rpcResponse.result;
                break;
              default:
                throw new BadServerDataError(
                  rpcResponse.id ? rpcResponse.id : null,
                  "The server returned an invalid response.",
                  -32004,
                );
            }
          }
        }
      } catch (err) {
        if (err.id === rpcRequest.id) {
          yield Promise.reject(err);
        }
      }
    }
  }

  private async *iterateNotifications(
    eventName: RpcRequest["method"],
  ): AsyncGenerator<JsonValue> {
    while (this.socket.readyState < 2) {
      const payloadData = await this.payloadData;
      if (payloadData === null) {
        break;
      }

      if (validateRpcNotification(payloadData)) {
        const rpcNotification = payloadData;
        if (rpcNotification.method === eventName) {
          yield rpcNotification.params || null;
        }
      }
    }
  }

  call(
    method: RpcRequest["method"],
    params: RpcRequest["params"],
    isNotification = false,
  ): Promise<JsonValue | undefined> {
    const rpcRequest = createRequest({
      method,
      params,
      isNotification,
    });
    this.socket.send(JSON.stringify(
      rpcRequest,
    ));
    if (isNotification) return Promise.resolve(undefined);
    const generator = this.iterateRequests(rpcRequest);
    return generator.next().then((p) => p.value);
  }

  subscribe(
    method: RpcRequest["method"],
  ) {
    const rpcRequest = createRequest({
      method: "subscribe",
    }) as Required<RpcRequest>;
    this.socket.send(JSON.stringify(
      {
        ...rpcRequest,
        params: { method, id: rpcRequest.id },
      },
    ));
    return {
      generator: this.iterateSubscriptions(rpcRequest),
      unsubscribe: (params?: RpcRequest["params"]): void => {
        const rpcRequestUnsubscription = createRequest({
          method: "unsubscribe",
          params: { method, id: rpcRequest.id },
        });
        return this.socket.send(JSON.stringify(
          rpcRequestUnsubscription,
        ));
      },
      emit: (params?: RpcRequest["params"]): void => {
        return this.socket.send(JSON.stringify(
          {
            ...rpcRequest,
            method: "emit",
            params: { method, params, id: rpcRequest.id },
          },
        ));
      },
      emitBatch: (params: RpcRequest["params"][]): void => {
        return this.socket.send(JSON.stringify(params.map((p) => (
          {
            ...rpcRequest,
            method: "emit",
            params: { method, params: p, id: rpcRequest.id },
          }
        ))));
      },
    };
  }

  listen(
    eventName: RpcRequest["method"],
  ) {
    return {
      generator: this.iterateNotifications(eventName),
    };
  }
}
