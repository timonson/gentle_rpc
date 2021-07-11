import { Client as WsClient } from "./ws.ts";
import { BadServerDataError } from "./error.ts";

import type { RpcRequest } from "../json_rpc_types.ts";

type WsProxyFunction = {
  (
    params?: RpcRequest["params"],
  ): ReturnType<WsClient["call"]>;
  notify: (
    params?: RpcRequest["params"],
  ) => ReturnType<WsClient["call"]>;
  subscribe: () => ReturnType<WsClient["subscribe"]>;
};

export type WsProxy =
  & {
    [method: string]: WsProxyFunction;
  }
  & { socket: WebSocket };

const wsProxyHandler = {
  get(client: WsClient, name: RpcRequest["method"]) {
    if (
      client[name as keyof WsClient] !== undefined || name === "then"
    ) {
      return client[name as keyof WsClient];
    } else {
      const proxyFunction: WsProxyFunction = (args?) => client.call(name, args);
      proxyFunction.notify = (args?) => client.call(name, args, true);
      proxyFunction.subscribe = () => client.subscribe(name);
      return proxyFunction;
    }
  },
};

function listen(socket: WebSocket): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    socket.onopen = () => resolve(socket);
    socket.onerror = (err) => reject(err);
  });
}

export function createRemote(
  socket: WebSocket,
): Promise<WsProxy> {
  return listen(socket)
    .then((socket) =>
      new Proxy<WsProxy>(
        new WsClient(socket),
        wsProxyHandler,
      )
    )
    .catch((err) =>
      Promise.reject(
        new BadServerDataError(
          null,
          "An error event occured on the WebSocket connection.",
          -32005,
          err.stack,
        ),
      )
    );
}
