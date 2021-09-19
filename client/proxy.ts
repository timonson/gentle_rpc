import type { JsonValue, RpcRequest } from "../json_rpc_types.ts";
import type { BatchArrayOutput, Remote as HttpRemote } from "./http.ts";
import type { Remote as WsRemote } from "./ws.ts";

/**
 * Example:
 * const proxy = new Proxy<HttpProxy>(
 *   createRemote(resource, options),
 *   httpProxyHandler,
 * );
 */
type HttpProxyFunction = {
  (
    params?: RpcRequest["params"],
  ): Promise<JsonValue>;
  notify: (
    params?: RpcRequest["params"],
  ) => Promise<undefined>;
  auth: (
    jwt: string,
  ) => (params?: RpcRequest["params"]) => Promise<JsonValue>;
  batch: (
    params: RpcRequest["params"][],
  ) => Promise<BatchArrayOutput>;
};
export type HttpProxy =
  & {
    [method: string]: HttpProxyFunction;
  }
  & { call: HttpRemote["call"] }
  & { batch: HttpRemote["batch"] };

export const httpProxyHandler = {
  get(client: HttpRemote, name: RpcRequest["method"]) {
    if (client[name as keyof HttpRemote] !== undefined) {
      return client[name];
    } else {
      const proxyFunction: HttpProxyFunction = (args?) =>
        client.call(name, args);
      proxyFunction.notify = (args?) =>
        client.call(name, args, { isNotification: true });
      proxyFunction.auth = (jwt) => (args?) => client.call(name, args, { jwt });
      proxyFunction.batch = (args) =>
        client.batch([{ [name]: args }], { isNotification: false });
      return proxyFunction;
    }
  },
};

/**
 * Example:
 * const proxy = new Proxy<WsProxy>(
 *   await createRemote(socket),
 *   wsProxyHandler,
 * );
 */
type WsProxyFunction = {
  (
    params?: RpcRequest["params"],
  ): ReturnType<WsRemote["call"]>;
  notify: (
    params?: RpcRequest["params"],
  ) => ReturnType<WsRemote["call"]>;
  subscribe: () => ReturnType<WsRemote["subscribe"]>;
};
export type WsProxy =
  & {
    [method: string]: WsProxyFunction;
  }
  & { socket: WebSocket };

export const wsProxyHandler = {
  get(client: WsRemote, name: RpcRequest["method"]) {
    if (
      client[name as keyof WsRemote] !== undefined || name === "then"
    ) {
      return client[name as keyof WsRemote];
    } else {
      const proxyFunction: WsProxyFunction = (args?) => client.call(name, args);
      proxyFunction.notify = (args?) => client.call(name, args, true);
      proxyFunction.subscribe = () => client.subscribe(name);
      return proxyFunction;
    }
  },
};
