import { serve } from "https://deno.land/std/http/server.ts"
import { respondRpc } from "../rpcServer.ts"

console.log("listening on 0.0.0.0:8000")
const s = serve("0.0.0.0:8000")
const rpcMethods = {
  sayHello: (w: string) => `Hello ${w}`,
  animalsMakeNoise: (noise: string) => noise.toUpperCase(),
  weCallThisMethod: (...words: string[]) =>
    `Now comes a sentence with ${words.reduce((acc, s) => (acc += ` ${s}`))}`,
}

for await (const req of s) {
  const result = await respondRpc(req, rpcMethods)
  // console.log(result)
}
