import { setupFileServer } from "./file_server.ts";
import { respondRpc } from "./rpcServer.ts";
import { rpcMethods } from "./rpcMethods.ts";
import { serve } from "https://deno.land/std/http/server.ts";

const { tlsOpts, handler, proto, addr } = setupFileServer();

console.log(`${proto.toUpperCase()} server listening on ${proto}://${addr}/`);
const server = serve(tlsOpts || addr);
for await (const req of server) {
  if (req.method === "GET") {
    handler(req);
  } else {
    respondRpc(req, rpcMethods);
  }
}
