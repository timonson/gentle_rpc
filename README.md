# gentle_rpc

JSON-RPC 2.0 library with WebSockets and HTTP support for
[deno](https://github.com/denoland/deno) and the browser.

This library is accessible through the https://deno.land/x/ service or through
https://nest.land/package/gentle_rpc.

## Server

### respond

Takes a `req`, `methods` and `options`. You can set options for an additional
server argument or public error stacks.

```typescript
import { serve } from "https://deno.land/std@0.84.0/http/server.ts"
import { respond } from "https://deno.land/x/gentle_rpc/mod.ts"

const s = serve("0.0.0.0:8000")
console.log("listening on 0.0.0.0:8000")

const rpcMethods = {
  sayHello: (w: [string]) => `Hello ${w}`,
  callNamedParameters: ({ a, b, c }: { a: number; b: number; c: string }) =>
    `${c} ${a * b}`,
  animalsMakeNoise: (noise: [string]) =>
    noise.map((el) => el.toUpperCase()).join(" "),
}

for await (const req of s) {
  await respond(req, rpcMethods)
}
```

## Client

#### createRemote

Takes a `resource` for HTTP or a `WebSocket` for WebSockets and returns a
TypeScript `Proxy` or `Promise<Proxy>` which we will call `remote` from now on.

```typescript
import { createRemote } from "https://deno.land/x/gentle_rpc/mod.ts"

// HTTP:
const remote = createRemote("http://0.0.0.0:8000")

// WebSocket:
const remote = await createRemote(new WebSocket("ws://0.0.0.0:8000"))
```

### HTTP

#### remote

All `remote` methods take an `Array<JsonValue>` or `Record<string, JsonValue>`
object and return `Promise<JsonValue | undefined>`.

```typescript
const greeting = await remote.sayHello(["World"])
// Hello World

const namedParams = await remote.callNamedParameters({
  a: 5,
  b: 10,
  c: "result:",
})
// result: 50
```

##### notification

```typescript
const notification = await remote.sayHello.notify(["World"])
// undefined
```

##### batch

```typescript
const noise1 = await remote.animalsMakeNoise.batch([
  ["miaaow"],
  ["wuuuufu", "wuuuufu"],
  ["iaaaiaia", "iaaaiaia", "iaaaiaia"],
  ["fiiiiire"],
])
// [ "MIAAOW", "WUUUUFU WUUUUFU", "IAAAIAIA IAAAIAIA IAAAIAIA", "FIIIIIRE" ]
```

##### auth

This method will set the `Authorization` header to `Bearer ${jwt}`.

```typescript
const greeting = await remote.sayHello.auth(jwt)(["World"])
// Hello World
```

##### batch with different methods

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

### WebSockets

The support for WebSockets is still experimental and has not been fully tested
yet.

#### remote

The `remote` proxy methods return a
`{ generator: AsyncGenerator<JsonValue>, send: (params?: RpcParams) => void }`
object.

```typescript
async function run(iter: AsyncGenerator<unknown>) {
  try {
    for await (let x of iter) {
      console.log(x)
    }
  } catch (err) {
    console.log(err.message, err.code)
  }
}

const greeting = remote.sayHello(["World"])
greeting.send(["second World"])

run(greeting.generator)
// Hello World
// Hello second World

// Close the WebSocket connection:
setTimeout(() => remote.socket.close(), 100)
```

##### notification

```typescript
const notification = remote.sayHello.notify(["World"])
```

##### messaging between multiple clients

Other clients can listen to the _emitted_ messages by _subscribing_ to the same
method.

```typescript
const greeting = remote.sayHello.subscribe()
greeting.emit(["first"])
greeting.emitBatch([["second"], ["third"]])
run(greeting.generator)
// Hello first
// Hello second
// Hello third

// You can optionally unsubscribe:
greeting.unsubscribe()
```

## Examples and Tests

Checkout the
[examples](https://github.com/timonson/gentle_rpc/tree/master/examples) and
[tests](https://github.com/timonson/gentle_rpc/tree/master/tests) folders for
more detailed examples.

## Contribution

Every kind of contribution to this project is highly appreciated.  
Please run `deno fmt` on the changed files before making a pull request.
