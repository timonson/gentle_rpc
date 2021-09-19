import { create, listenAndServe } from "../example_deps.ts";
import { respond } from "../../mod.ts";

const rpcMethods = {
  sayHello: ([w]: [string | undefined] = [undefined]) => `Hello ${w || ""}`,
  callNamedParameters: ({ a, b, c }: { a: number; b: number; c: string }) =>
    `${c} ${a * b}`,
  animalsMakeNoise: (noise: string[]) => {
    return noise.map((el) => el.toUpperCase()).join(" ");
  },
  sendJwt: async ({ user }: { user: string }) =>
    await create({ alg: "HS384", typ: "JWT" }, { user }, key),
  login: ({ payload }: { payload: { user: string } }) => {
    return payload.user;
  },
  additionalArg: ({ db }: any) => {
    return db.data;
  },
};

const key = await crypto.subtle.generateKey(
  { name: "HMAC", hash: "SHA-384" },
  true,
  ["sign", "verify"],
);

console.log("listening on 0.0.0.0:8000");

listenAndServe(":8000", (req) =>
  respond(rpcMethods, req, {
    auth: { key, methods: ["login"] },
    publicErrorStack: true,
    cors: true,
    additionalArguments: [{
      args: { db: { data: "some data" } },
      methods: ["additionalArg"],
    }],
  }));
