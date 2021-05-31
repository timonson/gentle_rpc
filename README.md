# gentle_rpc

JSON-RPC 2.0 library with WebSockets and HTTP support for
[deno](https://github.com/denoland/deno) and the browser.

This library is accessible through the https://deno.land/x/ service or through
https://nest.land/package/gentle_rpc.

## Server

### respond

Takes the arguments `methods`, `req` and `options`. You can set options for an
additional server argument or public error stacks.

```typescript
import { serve } from "https://deno.land/std@0.97.0/http/server.ts"
import { respond } from "https://deno.land/x/gentle_rpc/mod.ts"

const server = serve("0.0.0.0:8000")
const rpcMethods = {
  sayHello: (w: [string]) => `Hello ${w}`,
  callNamedParameters: ({ a, b, c }: { a: number; b: number; c: string }) =>
    `${c} ${a * b}`,
  animalsMakeNoise: (noise: string[]) =>
    noise.map((el) => el.toUpperCase()).join(" "),
}

console.log("listening on 0.0.0.0:8000")

for await (const req of server) {
  // HTTP:
  await respond(rpcMethods, req)
  // WebSockets:
  await respond(rpcMethods, req, { proto: "ws" })
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

##### auth

This method will set the `Authorization` header to `` `Bearer ${jwt}` ``.

```typescript
const greeting = await remote.sayHello.auth(jwt)(["World"])
// Hello World
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

All `remote` methods take an `Array<JsonValue>` or `Record<string, JsonValue>`
object and return `Promise<JsonValue | undefined>`.

```typescript
const noise = await remote.animalsMakeNoise(["wuufff"])
console.log(noise)

remote.socket.close()
```

##### notification

```typescript
const notification = await remote.animalsMakeNoise.notify(["wuufff"])
```

##### messaging between multiple clients

By using the `subscribe` method you can send messages between multiple clients.
It returns an object with a generator property
`{ generator: AsyncGenerator<JsonValue>}` and the methods `emit`, `emitBatch`
and `unsubscribe`.

Other clients can _listen to_ and _emit_ messages by _subscribing_ to the same
method.

```typescript
// First client
export async function run(iter: AsyncGenerator<unknown>) {
  try {
    for await (let x of iter) {
      console.log(x)
    }
  } catch (err) {
    console.log(err.message, err.code)
  }
}

const greeting = remote.sayHello.subscribe()
run(greeting.generator)
greeting.emit(["first"])
// Hello first
// Hello second
// Hello third
```

```typescript
// Second client
const greeting = remote.sayHello.subscribe()
run(greeting.generator)
greeting.emitBatch([["second"], ["third"]])
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
