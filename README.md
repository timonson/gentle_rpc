# gentle_rpc

JSON-RPC 2.0 TypeScript library for [deno](https://github.com/denoland/deno) and
the browser.

This library is accessible through the https://deno.land/x/ service or through
https://nest.land/package/gentle_rpc.

## Features

- Complies with the JSON-RPC 2.0
  [**specification**](https://www.jsonrpc.org/specification)
- Sends data with the
  [**fetch API**](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- Uses JavaScript/TypeScript native
  [**proxies**](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)
  for a simple API on the client side

## API

### respond

Takes a `req`, `methods` and `options`. You can set options for an additional
server argument or public error stacks.

```typescript
import { serve } from "https://deno.land/std@0.75.0/http/server.ts"
import { respond } from "https://deno.land/x/gentle_rpc/respond.ts"

const s = serve("0.0.0.0:8000")
console.log("listening on 0.0.0.0:8000")

const rpcMethods = {
  sayHello: ([w]: [string]) => `Hello ${w}`,
  animalsMakeNoise: (noise: [string]) =>
    noise.map((el) => el.toUpperCase()).join(" "),
  namedParameters: ({ a, b, c }: { a: number; b: number; c: string }) =>
    `${c} ${a * b}`,
}

for await (const req of s) {
  await respond(req, rpcMethods)
}
```

### createRemote

Takes a `resource` and `options` and returns a javascript `proxy` which we will
call `remote` from now on.

### remote

All `remote` methods take an `Array<JsonValue>` or `Record<string, JsonValue>`
object and return `Promise<JsonValue | undefined>`.

```typescript
import { createRemote } from "https://deno.land/x/gentle_rpc/request.ts"

const remote = createRemote("http://0.0.0.0:8000")
const greeting = await remote.sayHello(["World"])
const namedParameters = await remote.namedParameters({ a: 5, b: 10, c: "result:" })

console.log(greeting) // Hello World
console.log(namedParameters) // result: 50
```

```typescript
const remote = createRemote("http://0.0.0.0:8000", { isNotification: true })
await remote.sayHello(["World"]) // undefined
```

### remote.batch

Takes either a `batchObject` or a `batchArray` as argument and returns a
promise.

```typescript
await remote.batch({
  cat: ["sayHello", ["miaaow"]],
  dog: ["animalsMakeNoise", ["wuuuufu"]],
  donkey: ["sayHello"],
  dragon: ["animalsMakeNoise", ["fiiiiire", "fiiiiire"]],
})
// { cat: "Hello miaaow", dog: "WUUUUFU", donkey: "Hello ", dragon: "FIIIIIRE FIIIIIRE" }
```

The example above uses the object keys `cat`, `dog`, `donkey`, `dragon` as RPC
_request object ids_ under the hood. The returned _RPC result_ values will be
assigned to these keys.

For other use cases you might prefer the following example:

```typescript
await remote.batch([
  "animalsMakeNoise",
  ["miaaow"],
  ["wuuuufu", "wuuuufu"],
  ["iaaaiaia", "iaaaiaia", "iaaaiaia"],
  ["fiiiiire"],
])
// [ "MIAAOW", "WUUUUFU WUUUUFU", "IAAAIAIA IAAAIAIA IAAAIAIA", "FIIIIIRE" ]
```

## Examples and Tests

Checkout the
[examples](https://github.com/timonson/gentle_rpc/tree/master/examples) and
[tests](https://github.com/timonson/gentle_rpc/tree/master/tests) folders for
more detailed examples.

## Contribution

Every kind of contribution to this project is highly appreciated.  
Please run `deno fmt` on the changed files before making a pull request.
