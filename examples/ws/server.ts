import { create } from "../example_deps.ts";
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

const server = Deno.listen({ port: 8000 });

console.log("Listening on http://localhost:8000");

for await (const conn of server) {
  (async () => {
    const httpConn = Deno.serveHttp(conn);
    for await (const requestEvent of httpConn) {
      requestEvent.respondWith(
        await respond(rpcMethods, requestEvent.request, {
          proto: "ws",
          enableInternalMethods: true,
          publicErrorStack: true,
          auth: {
            key,
            methods: ["login"],
            jwt: requestEvent.request.headers.get("sec-websocket-protocol"),
          },
        }),
      );
    }
  })();
}
