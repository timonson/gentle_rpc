import { serve, ServerRequest } from "https://deno.land/std/http/server.ts"
import { respondRpc } from "../rpcServer.ts"

const s = serve("0.0.0.0:8000")
const rpcMethods = {
  sayHello: (w: string) => `Hello ${w}`,
  animalsMakeNoise: (noise: string) => noise.toUpperCase(),
}

for await (const req of s) {
  const result = await respondRpc(req, rpcMethods)
  // console.log(result)
}
