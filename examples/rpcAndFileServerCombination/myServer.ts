import { respond as respondRpc } from "../../respond.ts";
import { rpcMethods } from "./rpcMethods.ts";
import { serve } from "https://deno.land/std@0.74.0/http/server.ts";
import { fetch } from "https://cdn.jsdelivr.net/gh/lucacasonato/deno_local_file_fetch@164a369bd7311269289d438bb27a648731c33909/mod.ts";
import { dirname } from "https://deno.land/std/path/mod.ts";

const proto = "http";
const addr = "0.0.0.0:8000";
console.log(`${proto.toUpperCase()} server listening on ${proto}://${addr}/`);

for await (const req of serve(addr)) {
  switch (req.method) {
    case "GET":
      const result = await fetch(
        dirname(import.meta.url) + "/static" + req.url,
      );
      req.respond(
        {
          body: new Uint8Array(await result.arrayBuffer()),
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
