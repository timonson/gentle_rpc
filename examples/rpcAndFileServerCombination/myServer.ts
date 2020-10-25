import { fileHandler } from "./file_server.ts";
import { respond as respondRpc } from "../../respond.ts";
import { rpcMethods } from "./rpcMethods.ts";
import { serve } from "https://deno.land/std@0.75.0/http/server.ts";

const proto = "http";
const addr = "0.0.0.0:8000";
console.log(`${proto.toUpperCase()} server listening on ${proto}://${addr}/`);
for await (const req of serve(addr)) {
  if (req.method === "GET") {
    fileHandler(req, { root: "./static" });
  } else if (req.method === "POST") {
    respondRpc(req, rpcMethods);
  } else req.respond({ status: 405 });
}
