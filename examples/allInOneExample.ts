import { createRemote } from "../rpcClient.ts"
import { serve, ServerRequest } from "https://deno.land/std/http/server.ts"
import { respondRpc } from "../rpcServer.ts"

const remote = createRemote("http://0.0.0.0:8000")
const s = serve("0.0.0.0:8000")
const weCallThisMethod = (...words: string[]) =>
  `Now comes a sentence of ${words}`

for await (const req of s) {
  const result = await respondRpc(req, { weCallThisMethod })
  console.log(result)
}

const sentence = await remote.weCallThisMethod("a lot of cool words")
console.log(sentence)
