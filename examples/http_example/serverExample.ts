import { serve } from "../example_deps.ts";
import { respond } from "../../mod.ts";

const s = serve("0.0.0.0:8000");
console.log("listening on 0.0.0.0:8000");
const rpcMethods = {
  sayHello: (w: [string]) => `Hello ${w}`,
  callNamedParameters: ({ a, b, c }: { a: number; b: number; c: string }) =>
    `${c} ${a * b}`,
  animalsMakeNoise: (noise: [string]) =>
    noise.map((el) => el.toUpperCase()).join(" "),
};

for await (const req of s) {
  const result = await respond(req, rpcMethods);
}
