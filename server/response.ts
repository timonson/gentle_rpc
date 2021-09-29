import { handleHttpRequest } from "./http.ts";
import { handleWs } from "./ws.ts";
import { internalMethods } from "./ws_internal_methods.ts";
import { createRpcResponseObject } from "./creation.ts";

import type { JsonValue } from "../json_rpc_types.ts";

export type Methods = {
  [method: string]: (...arg: any) => JsonValue | Promise<JsonValue>;
};
export type Options = {
  // Add headers to the default header '{"content-type" : "application/json"}':
  headers?: Headers;
  // include or don't include server side error messages in response:
  publicErrorStack?: boolean;
  // enable 'subscribe', 'emit' and 'unsubscribe' (only ws):
  enableInternalMethods?: boolean;
  // defaults to http:
  proto?: "ws" | "http";
  // Enable CORS via the "Access-Control-Allow-Origin" header (only http):
  cors?: boolean;
  // The server can pass additional arguments to the rpc methods:
  additionalArguments?: {
    // e.g. `args: {db : new Db()}`, where 'db' will be the named parameter:
    args: Record<string, any>;
    methods?: (keyof Methods)[];
    allMethods?: boolean;
  }[];
  // for jwt verification (only http):
  auth?: {
    key?: CryptoKey;
    methods?: (keyof Methods)[];
    allMethods?: boolean;
  };
};

export async function respond(
  methods: Methods,
  req: any,
  {
    headers = new Headers(),
    publicErrorStack = false,
    enableInternalMethods = false,
    proto = "http",
    cors = false,
    additionalArguments = [],
    auth = {},
  }: Options = {},
) {
  switch (proto) {
    case "http":
      return await handleHttpRequest(
        req,
        methods,
        {
          headers,
          publicErrorStack,
          enableInternalMethods,
          additionalArguments,
          proto,
          cors,
          auth,
        },
        req.headers.get("Authorization"),
      );
      break;
    case "ws":
      const methodsAndIdsStore = new Map();
      const { socket, response } = Deno.upgradeWebSocket(req.request);
      handleWs(
        {
          socket,
          methods: enableInternalMethods
            ? { ...methods, ...internalMethods }
            : methods,
          options: {
            headers,
            publicErrorStack,
            enableInternalMethods,
            additionalArguments: enableInternalMethods
              ? [...additionalArguments, {
                args: { methodsAndIdsStore },
                methods: ["subscribe", "unsubscribe"],
              }]
              : additionalArguments,
            proto,
            cors,
            auth,
          },
        },
        req.request.headers.get("sec-websocket-protocol"),
      );
      req.respondWith(response);
      return response;
      break;
    default:
      throw new TypeError(`The protocol '${proto}' is not supported.`);
  }
}
