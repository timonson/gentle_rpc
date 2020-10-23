import { fileHandler } from "./file_server.ts";
import { respond as respondRpc } from "../../respond.ts";
import { rpcMethods } from "./rpcMethods.ts";
import { serve } from "https://deno.land/std/http/server.ts";

const proto = "http";
const addr = "0.0.0.0:8000";
const tlsOpts = undefined;
console.log(`${proto.toUpperCase()} server listening on ${proto}://${addr}/`);
const server = serve(tlsOpts || addr);
for await (const req of server) {
  if (req.method === "GET") {
    fileHandler(req, { root: "./static" });
  } else {
    respondRpc(req, rpcMethods);
  }
}
