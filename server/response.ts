import { handleHttpRequest } from "./http.ts";
import { handleWs } from "./ws.ts";
import { internalMethods } from "./ws_internal_methods.ts";

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
  // defaults to 'both':
  proto?: "ws" | "http" | "both";
  // Enable CORS via the "Access-Control-Allow-Origin" header (only http):
  cors?: boolean;
  // The server can pass additional arguments to the rpc methods:
  additionalArguments?: {
    // e.g. `args: {db : new Db()}`, where 'db' will be the named parameter:
    args: Record<string, any>;
    methods?: (keyof Methods)[];
    allMethods?: boolean;
  }[];
  // for jwt verification:
  auth?: {
    key?: CryptoKey;
    methods?: (keyof Methods)[];
    allMethods?: boolean;
    jwt?: string | null;
  };
};

export async function respond(
  methods: Methods,
  req: Request,
  {
    headers = new Headers(),
    publicErrorStack = false,
    enableInternalMethods = false,
    proto = "both",
    cors = false,
    additionalArguments = [],
    auth = {},
  }: Options = {},
): Promise<Response> {
  const realProto = req.headers.get("upgrade") === "websocket" ? "ws" : "http";
  if (
    (proto === "http" || proto === "both") && realProto === "http"
  ) {
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
  } else if ((proto === "ws" || proto === "both") && realProto === "ws") {
    const { socket, response } = Deno.upgradeWebSocket(req);
    const methodsAndIdsStore = new Map();
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
      auth.jwt,
    );
    return response;
  } else {
    throw new TypeError(
      `The received protocol '${realProto}' doesn't match the expected protocol '${proto}'.`,
    );
  }
}
