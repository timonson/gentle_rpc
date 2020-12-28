import { createRequest } from "./creation.ts";
import { validateResponse } from "./validation.ts";
import { BadServerDataError } from "./error.ts";

import type { JsonValue, RpcRequest } from "../json_rpc_types.ts";

function isObject(obj: unknown): obj is Record<string, unknown> {
  return (
    obj !== null && typeof obj === "object" && Array.isArray(obj) === false
  );
}

export class Client {
  private payloadData!: Promise<any>;
  socket: WebSocket;
  [key: string]: any // necessary for es6 proxy
  constructor(socket: WebSocket) {
    this.socket = socket;
    this.getPayloadData(socket);
  }

  private async getPayloadData(socket: WebSocket): Promise<any> {
    this.payloadData = new Promise((resolve, reject) => {
      socket.onmessage = (event: MessageEvent) => {
        resolve(event.data);
      };
      socket.onclose = () => resolve(null);
    });
    await this.payloadData;
    if (socket.readyState > 1) return this.payloadData;
    return this.getPayloadData(socket);
  }

  private async *iterateOverPayloadData(
    rpcRequest: RpcRequest,
  ): AsyncGenerator<JsonValue> {
    while (this.socket.readyState < 2) {
      try {
        const payloadData = await this.payloadData;
        if (payloadData === null) {
          break;
        }
        const parsedData = JSON.parse(payloadData);
        const rpcResponse = Array.isArray(parsedData) && parsedData.length > 0
          ? parsedData.map(validateResponse)
          : validateResponse(parsedData);
        if (Array.isArray(rpcResponse)) {
          continue;
        } else {
          if (
            isObject(rpcResponse.result) &&
            rpcResponse.result.id === rpcRequest.id
          ) {
            if (
              rpcResponse.result.event === "subscribed" ||
              rpcResponse.result.event === "emitted"
            ) {
              continue;
            }
            if (rpcResponse.result.event === "unsubscribed") {
              break;
            }
          }
          if (rpcResponse.id === rpcRequest.id) {
            yield rpcResponse.result;
          }
        }
      } catch (err) {
        yield Promise.reject(
          err instanceof BadServerDataError
            ? err
            : new BadServerDataError(err.message, -32001),
        );
      }
    }
  }

  call(
    method: RpcRequest["method"],
    params: RpcRequest["params"],
    isNotification = false,
  ): {
    generator: AsyncGenerator<JsonValue>;
    send: (params?: RpcRequest["params"]) => void;
  } {
    const rpcRequest = createRequest({
      method,
      params,
      isNotification,
    });
    this.socket.send(JSON.stringify(
      rpcRequest,
    ));
    return {
      generator: this.iterateOverPayloadData(rpcRequest),
      send: (params?: RpcRequest["params"]): void => {
        return this.socket.send(JSON.stringify(
          { ...rpcRequest, params },
        ));
      },
    };
  }

  subscribe(
    method: RpcRequest["method"],
  ) {
    const rpcRequest = createRequest({
      method: "subscribe",
      params: { method },
    });
    this.socket.send(JSON.stringify(
      rpcRequest,
    ));
    return {
      generator: this.iterateOverPayloadData(rpcRequest),
      unsubscribe: (params?: RpcRequest["params"]): void => {
        const rpcRequestUnsubscription = createRequest({
          method: "unsubscribe",
          params: { method, id: rpcRequest.id as string },
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
            params: { method, params, id: rpcRequest.id as string },
          },
        ));
      },
      emitBatch: (params: RpcRequest["params"][]): void => {
        return this.socket.send(JSON.stringify(params.map((p) => (
          {
            ...rpcRequest,
            method: "emit",
            params: { method, params: p, id: rpcRequest.id as string },
          }
        ))));
      },
    };
  }
}
