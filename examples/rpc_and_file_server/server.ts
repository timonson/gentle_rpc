import { respond as respondRpc } from "../../mod.ts";
import { rpcMethods } from "./rpcMethods.ts";
import { PressF, respondWithFile } from "../example_deps.ts";

const proto = "http";
const hostname = "0.0.0.0";
const port = 8000;
const root = "static";
console.log(
  `${proto.toUpperCase()} server listening on ${proto}://${hostname}:${port}/`,
);

const app = new PressF();

app.get("*", respondWithFile(new URL(root, import.meta.url).pathname));
app.post("*", (req) => respondRpc(rpcMethods, req));

await app.listen(port);
