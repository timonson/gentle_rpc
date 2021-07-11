import { Client as HttpClient } from "./http.ts";

import type { JsonArray, RpcRequest } from "../json_rpc_types.ts";

export type Resource = string | URL | Request;

type HttpProxyFunction = {
  (
    params?: RpcRequest["params"],
  ): ReturnType<HttpClient["call"]>;
  notify: (
    params?: RpcRequest["params"],
  ) => ReturnType<HttpClient["call"]>;
  auth: (
    jwt: string,
  ) => (params?: RpcRequest["params"]) => ReturnType<HttpClient["call"]>;
  batch: (
    params: RpcRequest["params"][],
    isNotification?: boolean,
  ) => Promise<JsonArray | undefined>;
};

export type HttpProxy = {
  [method: string]: HttpProxyFunction;
} & { batch: HttpClient["batch"] };

const httpProxyHandler = {
  get(client: HttpClient, name: RpcRequest["method"]) {
    if (client[name as keyof HttpClient] !== undefined) {
      return client[name as keyof HttpClient];
    } else {
      const proxyFunction: HttpProxyFunction = (args?) =>
        client.call(name, args);
      proxyFunction.notify = (args?) =>
        client.call(name, args, { isNotification: true });
      proxyFunction.auth = (jwt) => (args?) => client.call(name, args, { jwt });
      proxyFunction.batch = (args, isNotification = false) =>
        client.batch([name, ...args], isNotification);
      return proxyFunction;
    }
  },
};

export function createRemote(
  resource: Resource,
  options?: RequestInit,
): HttpProxy {
  return new Proxy<HttpProxy>(
    new HttpClient(resource, options),
    httpProxyHandler,
  );
}
