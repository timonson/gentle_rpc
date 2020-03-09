# gentleRpc

JSON-RPC 2.0 TypeScript library for [deno](https://github.com/denoland/deno) and
the browser.

## Features

- Complies with the JSON-RPC 2.0
  [**specification**](https://www.jsonrpc.org/specification)
- Uses TypeScript native
  [**proxies**](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)
  for a simpler API on the client side
- Transfers data over the
  [**fetch API**](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

## Example

#### Server/deno side

```typescript
import { serve, ServerRequest } from "https://deno.land/std/http/server.ts"
import { respondRpc } from "https://cdn.jsdelivr.net/gh/timonson/gentleRpc@latest/rpcServer.ts"

const s = serve("0.0.0.0:8000")
const rpcMethods = {
  sayHello: (w: string) => `Hello ${w}`,
  animalsMakeNoise: (noise: string) => noise.toUpperCase(),
}

for await (const req of s) {
  await respondRpc(req, rpcMethods)
}
```

#### Client/remote side

```typescript
import { createRemote } from "https://cdn.jsdelivr.net/gh/timonson/gentleRpc@latest/rpcClient.ts"

const remote = createRemote("http://0.0.0.0:8000")
const greeting = await remote.sayHello("World") // Hello World
```

## API

### Server

#### respondRpc(request, methods, { includeServerErrorStack, callMethodsWithRequestObj })

- request: `ServerRequest`
- methods: `{ [method: string]: (...args: any[]) => any }`
- includeServerErrorStack: `boolean` detemines if the client's error objects may
  contain the server's error stack. Default is `false`.
- callMethodsWithRequestObj: `boolean` if true the request object will be added
  as the first argument to the method call. Default is `false`.

### Client

#### createRemote(url, options, handleUnsuccessfulResponse)

- `url: string` fetch data from
- `options: object` this object will be merged into default options for _fetch_
  with exception of the two additional and optional properties
  `notification: boolean` and `id: string | number`.
  - `notification` causes the server to make an empty response
  - `id` sets an custom id
- `handleUnsuccessfulResponse: (response: object => any)` this optional callback
  is called, with the returned response object as argument, if _fetch_ was not
  successful (status code outside the range 200-299).

#### remote.method(arguments)

Each method call of the remote object will look for the identically named method
on the server side, where the methods have been defined. It is based on the
native JavaScript **Proxy** object.

The methods return the **result** or **error** property of the RPC response
object as promise.

Any number of arguments to the method calls is possible.

```typescript
await remote.sayHello("World") // // Hello World
```

#### remote.batch(object)

Additionally, to send several request objects at the same time, the client may
send an array filled with request objects. You can do this on two different
ways:

1. remote.batch(["method1", ["arg1", "arg2"]])

```typescript
const noise1 = await remote.batch([
  ["animalsMakeNoise", ["miaaow"]],
  ["animalsMakeNoise", ["wuuuufu"]],
  ["animalsMakeNoise", ["iaaaiaia"]],
  ["animalsMakeNoise", ["fiiiiire"]],
])
// [ "MIAAOW", "WUUUUFU", "IAAAIAIA", "FIIIIIRE" ]
```

2. remote.batch({key: ["method1", ["arg1", "arg2"]]})

The way of making _batch_ requests uses the object keys (_cat, dog, donkey,
dragon_) as RPC _request object ids_ under the hood. The returned result values
will be assigned to these key. Let's take a look at the following example:

```typescript
const noise2 = await remote.batch({
  cat: ["animalsMakeNoise", ["miaaow"]],
  dog: ["animalsMakeNoise", ["wuuuufu"]],
  donkey: ["animalsMakeNoise", ["iaaaiaia"]],
  dragon: ["animalsMakeNoise", ["fiiiiire"]],
})
// { cat: "MIAAOW", dog: "WUUUUFU", donkey: "IAAAIAIA", dragon: "FIIIIIRE" }
```

Checkout the
[examples](https://github.com/timonson/gentleRpc/tree/master/examples) and
[tests](https://github.com/timonson/gentleRpc/tree/master/tests) folders for
more detailed examples.
