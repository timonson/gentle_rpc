import { serve } from "../example_deps.ts";
import { respond } from "../../mod.ts";

const server = serve("0.0.0.0:8000");
const rpcMethods = {
  sayHello: ({ w }: { w: string }) => `Hello ${w}`,
  callNamedParameters: ({ a, b, c }: { a: number; b: number; c: string }) =>
    `${c} ${a * b}`,
  animalsMakeNoise: (noise: string[]) => {
    console.log("noise:", noise);
    return noise.map((el) => el.toUpperCase()).join(" ");
  },
};

console.log("listening on 0.0.0.0:8000");

for await (const req of server) {
  if (req.headers.get("Upgrade")) {
    respond(rpcMethods, req, {
      publicErrorStack: true,
      proto: "ws",
      enableInternalMethods: true,
    });
  } else req.respond({ status: 405 });
}
