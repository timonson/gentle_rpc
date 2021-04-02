import { respond } from "../../mod.ts";
import { Context } from "../example_deps.ts";

export const rpcMethods = {
  sayHello: (w: [string]) => `Hello ${w}`,
  callNamedParameters: ({ a, b, c }: { a: number; b: number; c: string }) =>
    `${c} ${a * b}`,
  animalsMakeNoise: (noise: string[]) =>
    noise.map((el) => el.toUpperCase()).join(" "),
};

export const respondRpc = (req: any) => respond(rpcMethods, req);
