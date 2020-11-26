import { serve } from "../example_deps.ts";
import { createRpcResponseObject, respond } from "../../mod.ts";

import type { RpcRequest } from "../../mod.ts";

const s = serve("0.0.0.0:8000");
console.log("listening on 0.0.0.0:8000");
const rpcMethods = {
  sayHello: (w: [string]) => `Hello ${w}`,
  callNamedParameters: ({ a, b, c }: { a: number; b: number; c: string }) =>
    `${c} ${a * b}`,
  animalsMakeNoise: (noise: [string]) =>
    noise.map((el) => el.toUpperCase()).join(" "),
  subtract: (input: number[]) => {
    return input[0] - input[1];
  },
};

for await (const req of s) {
  const result = respond(req, rpcMethods, { publicErrorStack: true });
}
