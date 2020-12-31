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
  argument?: Record<string, any>;
  methods?: (keyof ServerMethods)[];
  allMethods?: boolean;
  publicErrorStack?: boolean;
  headers?: [string, string][];
};

export async function respond(
  req: ServerRequest,
  methods: ServerMethods,
  options: RespondOptions = {},
) {
  switch (req.headers.get("Upgrade")) {
    case "websocket":
      const { conn, r: bufReader, w: bufWriter, headers } = req;
      return acceptWebSocket({
        conn,
        bufReader,
        bufWriter,
        headers,
      })
        .then((socket: WebSocket) =>
          handleWs(
            { socket, methods: { ...methods, ...internalMethods }, options },
          )
        )
        .catch(async (err) => {
          console.error(`failed to accept websocket: ${err}`);
          await req.respond({ status: 400 });
          return err;
        });
      break;
    default:
      const response = await handleHttpRequest(
        new TextDecoder().decode(await Deno.readAll(req.body)),
        methods,
        options,
      );
      req.respond(
        response === undefined
          ? {
            status: 204,
            headers: new Headers(
              options.headers ? options.headers : [],
            ),
          }
          : {
            body: new TextEncoder().encode(response),
            headers: new Headers(
              options.headers
                ? [["content-type", "application/json"], ...options.headers]
                : [["content-type", "application/json"]],
            ),
            status: 200,
          },
      );
      return response;
  }
}
