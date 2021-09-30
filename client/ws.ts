import { createRequest } from "./creation.ts";
import { validateResponse, validateRpcNotification } from "./validation.ts";
import { BadServerDataError } from "./error.ts";

import type { JsonValue, RpcRequest } from "../json_rpc_types.ts";

function isObject(obj: unknown): obj is Record<string, unknown> {
  return (
    obj !== null && typeof obj === "object" && Array.isArray(obj) === false
  );
}

export class Remote {
  private textDecoder?: TextDecoder;
  private payloadData!: Promise<JsonValue>;
  socket: WebSocket;
  [key: string]: any // necessary for es6 proxy
  constructor(
    socket: WebSocket,
  ) {
    this.socket = socket;
    this.getPayloadData(socket);
  }

  private async getPayloadData(socket: WebSocket): Promise<void> {
    this.payloadData = new Promise<JsonValue>((resolve, reject) => {
      socket.onmessage = async (event: MessageEvent) => {
        let msg: string;
        if (event.data instanceof Blob) {
          msg = this.getTextDecoder().decode(await event.data.arrayBuffer());
        } else if (event.data instanceof ArrayBuffer) {
          msg = this.getTextDecoder().decode(event.data);
        } else {
          msg = event.data;
        }
        try {
          resolve(JSON.parse(msg));
        } catch (err) {
          reject(
            new BadServerDataError(null, "The received data is invalid JSON."),
          );
        }
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
      try {
        const payloadData = await this.payloadData;
        if (payloadData === null) {
          break;
        }
        if (validateRpcNotification(payloadData)) {
          continue;
        }
        const rpcResponse = validateResponse(payloadData);
        if (rpcResponse.id !== rpcRequest.id) {
          continue;
        }
        yield rpcResponse.result;
        break;
      } catch (err) {
        if (err.id === rpcRequest.id || err.id === null) {
          yield Promise.reject(err);
          break;
        }
      }
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
        if (validateRpcNotification(payloadData)) {
          continue;
        }
        const rpcResponse = validateResponse(payloadData);
        if (rpcResponse.id !== rpcRequest.id) {
          continue;
        }
        if (
          isObject(rpcResponse.result) &&
          rpcResponse.result.id === rpcRequest.id
        ) {
          if (rpcResponse.result.event === "subscribed") {
            continue;
          } else if (rpcResponse.result.event === "unsubscribed") {
            break;
          } else if (rpcResponse.result.event === "emitted") {
            continue;
          }
        } else {
          yield rpcResponse.result;
          continue;
        }
      } catch (err) {
        if (err.id === rpcRequest.id || err.id === null) {
          yield Promise.reject(err);
          break;
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
    params?: RpcRequest["params"],
    options?: { isNotification?: false },
  ): Promise<JsonValue>;
  call(
    method: RpcRequest["method"],
    params: RpcRequest["params"],
    options: { isNotification: true },
  ): Promise<undefined>;
  call(
    method: RpcRequest["method"],
    params: RpcRequest["params"],
    { isNotification }: { isNotification?: boolean } = {},
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
