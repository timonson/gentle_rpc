import { respond as respondRpc } from "../../respond.ts";
import { rpcMethods } from "./rpcMethods.ts";
import { serve } from "https://deno.land/std@0.75.0/http/server.ts";
import { fetch } from "https://cdn.jsdelivr.net/gh/timonson/salad@v0.0.8/fetch/fetchPolyfill.ts";
import { createFileUrl } from "https://cdn.jsdelivr.net/gh/timonson/salad@v0.0.8/fetch/createFileUrl.ts";

const proto = "http";
const addr = "0.0.0.0:8000";
const root = "static";
console.log(`${proto.toUpperCase()} server listening on ${proto}://${addr}/`);

for await (const req of serve(addr)) {
  switch (req.method) {
    case "GET":
      const result = await fetch(
        createFileUrl(
          { moduleUrl: import.meta.url, reqUrl: req.url, root },
        ),
      );

      req.respond(
        {
          body: result.ok
            ? new Uint8Array(await result.arrayBuffer())
            : await result.text(),
          headers: result.headers,
          status: result.status,
        },
      );
      break;
    case "POST":
      respondRpc(req, rpcMethods);
      break;
    default:
      req.respond({ status: 405 });
  }
}
