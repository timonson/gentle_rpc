import { respond as respondRpc } from "../../mod.ts";
import { rpcMethods } from "./rpcMethods.ts";
import { serve } from "../example_deps.ts";
import { fetch } from "https://cdn.jsdelivr.net/gh/timonson/salad@v0.1.0/fetch/fetchPolyfill.ts";
import { createStaticFilePath } from "https://cdn.jsdelivr.net/gh/timonson/salad@v0.1.0/pathsAndUrls.ts";

const proto = "http";
const addr = "0.0.0.0:8000";
const root = "static";
console.log(`${proto.toUpperCase()} server listening on ${proto}://${addr}/`);

for await (const req of serve(addr)) {
  switch (req.method) {
    case "GET":
      const result = await fetch(
        createStaticFilePath(
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