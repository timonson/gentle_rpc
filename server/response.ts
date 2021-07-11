import { handleHttpRequest } from "./http.ts";
import { handleWs } from "./ws.ts";
import { acceptWebSocket } from "./deps.ts";
import { internalMethods } from "./ws_internal_methods.ts";

import type { ServerRequest, WebSocket } from "./deps.ts";
import type { JsonValue } from "../json_rpc_types.ts";

export type ServerMethods = {
  [method: string]: (...arg: any) => JsonValue | Promise<JsonValue>;
};
export type RespondOptions = {
  // Add headers to the default header '{"content-type" : "application/json"}'
  headers?: Headers;
  // include or don't include server side error messages in response
  publicErrorStack?: boolean;
  // only important for 'ws'
  disableInternalMethods?: boolean;
  // defaults to http
  proto?: "ws" | "http";
  additionalArguments?: {
    // e.g. `arg: {db : new Db()}`, where 'db' will be the named parameter.
    arg: Record<string, any>;
    methods?: (keyof ServerMethods)[];
    allMethods?: boolean;
  }[];
};

export async function respond(
  methods: ServerMethods,
  req: ServerRequest,
  {
    headers = new Headers(),
    publicErrorStack = false,
    disableInternalMethods = false,
    proto = "http",
    additionalArguments = [],
  }: RespondOptions = {},
) {
  switch (proto) {
    case "ws":
      const { conn, r: bufReader, w: bufWriter, headers: reqHeaders } = req;
      return acceptWebSocket({
        conn,
        bufReader,
        bufWriter,
        headers: reqHeaders,
      })
        .then((socket: WebSocket) => {
          const methodsAndIdsStore = new Map();
          if (disableInternalMethods) {
            return handleWs(
              {
                socket,
                methods,
                options: {
                  headers,
                  publicErrorStack,
                  disableInternalMethods,
                  additionalArguments,
                  proto,
                },
              },
            );
          } else {
            return handleWs(
              {
                socket,
                methods: { ...methods, ...internalMethods },
                options: {
                  headers,
                  publicErrorStack,
                  disableInternalMethods,
                  additionalArguments: [...additionalArguments, {
                    arg: methodsAndIdsStore,
                    methods: ["subscribe", "unsubscribe"],
                  }],
                  proto,
                },
              },
            );
          }
        })
        .catch(async (err) => {
          console.error(`failed to accept websocket: ${err}`);
          await req.respond({ status: 400 });
          return err;
        });
      break;
    case "http":
      const response = await handleHttpRequest(
        new TextDecoder().decode(await Deno.readAll(req.body)),
        methods,
        {
          headers,
          publicErrorStack,
          disableInternalMethods,
          additionalArguments,
          proto,
        },
      );
      await req.respond(
        response === undefined
          ? {
            status: 204,
            headers: headers,
          }
          : {
            body: new TextEncoder().encode(response),
            headers: new Headers(
              [...headers.entries(), [
                "content-type",
                "application/json",
              ]],
            ),
            status: 200,
          },
      );
      return response;
      break;
    default:
      throw new TypeError(`The protocol '${proto}' is not supported.`);
  }
}
