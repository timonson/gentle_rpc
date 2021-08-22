import { create, serve } from "../example_deps.ts";
import { respond } from "../../mod.ts";

const server = serve("0.0.0.0:8000");

const rpcMethods = {
  sayHello: ([w]: [string | undefined] = [undefined]) => `Hello ${w || ""}`,
  callNamedParameters: ({ a, b, c }: { a: number; b: number; c: string }) =>
    `${c} ${a * b}`,
  animalsMakeNoise: (noise: string[]) => {
    return noise.map((el) => el.toUpperCase()).join(" ");
  },
  sendJwt: async ({ user }: { user: string }) =>
    await create({ alg: "HS384", typ: "JWT" }, { user }, key),
  login: (payload: { user: string }) => {
    return payload.user;
  },
};

const key = await crypto.subtle.generateKey(
  { name: "HMAC", hash: "SHA-384" },
  true,
  ["sign", "verify"],
);

console.log("listening on 0.0.0.0:8000");

for await (const req of server) {
  respond(rpcMethods, req, {
    auth: { key, methods: ["login"] },
    publicErrorStack: true,
  });
}
