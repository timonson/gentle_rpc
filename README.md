# gentleRpc

JSON-RPC 2.0 TypeScript library for [deno](https://github.com/denoland/deno) and
the browser.

This library is accessible through the https://deno.land/x/ service.

## Features

- Complies with the JSON-RPC 2.0
  [**specification**](https://www.jsonrpc.org/specification)
- Sends data with the
  [**fetch API**](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- Uses JavaScript/TypeScript native
  [**proxies**](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)
  for a simple API on the client side

## Example

#### Server/deno side

```typescript
import { serve, ServerRequest } from "https://deno.land/std/http/server.ts"
import { respondRpc } from "https://deno.land/x/gentleRpc/rpcServer.ts"

console.log("listening on 0.0.0.0:8000")
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
import { createRemote } from "https://deno.land/x/gentleRpc/rpcClient.ts"


let myUrl = new URL("http://127.0.0.1")
myUrl.port = "8000"
myUrl.username = "RPC_Username"
myUrl.password = "RPC_Password"

const remote = createRemote(myUrl)
const greeting = await remote.sayHello("World")
console.log(greeting) // Hello World
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
- returns the RPC response object.

### Client

#### createRemote(url, options)

- `url: URL` the URL to _fetch_ data from.
- `options: Options` this object sets the _fetch_ API options (_RequestInit_).
  Additionally, it contains the three optional properties
  `notification: boolean`, `id: string | number` and
  `handleUnsuccessfulResponse: (response: Response => any)`.
  - `notification` causes the server to make an empty response.
  - `id` defines a custom id.
  - `handleUnsuccessfulResponse` contains an optional callback which is called
    if _fetch_ was not successful (status code outside the range 200-299). It
    takes the returned response object as argument.
- returns a _remote_ proxy object (see below).

#### remote.method(values)

Each method call of the remote object will look for the identically named method
on the server side, where the methods are defined. This API is based on the
native JS/TS **Proxy** object.

Any amount of arguments to the method calls is possible.

The _remote methods_ return the **result** property of the RPC response object
as promise.

```typescript
await remote.sayHello("World") // Hello World
```

#### Batch Requests

Additionally, to send several request objects at the same time, the client may
send an array filled with request objects (an _RPC batch request_). You can do
this in two different ways:

##### remote.batch([["method", ["arg1", "arg2"]], ["method", ["arg1", "arg2"]], ...])

```typescript
const noise1 = await remote.batch([
  ["animalsMakeNoise", ["miaaow"]],
  ["animalsMakeNoise", ["wuuuufu"]],
  ["animalsMakeNoise", ["iaaaiaia"]],
  ["animalsMakeNoise", ["fiiiiire"]],
])
// [ "MIAAOW", "WUUUUFU", "IAAAIAIA", "FIIIIIRE" ]
```

##### remote.batch({key1: ["method", ["arg1", "arg2"]], key2: ["method", ["arg1", "arg2"]], ...})

This way of making _batch_ requests uses the object keys (_cat, dog, donkey,
dragon_) as RPC _request object ids_ under the hood. The returned _RPC result_
values will be assigned to these keys. Let's take a look at the following
example:

```typescript
const noise2 = await remote.batch({
  cat: ["animalsMakeNoise", ["miaaow"]],
  dog: ["animalsMakeNoise", ["wuuuufu"]],
  donkey: ["animalsMakeNoise", ["iaaaiaia"]],
  dragon: ["animalsMakeNoise", ["fiiiiire"]],
})
// { cat: "MIAAOW", dog: "WUUUUFU", donkey: "IAAAIAIA", dragon: "FIIIIIRE" }
```

### Examples and Tests

Checkout the
[examples](https://github.com/timonson/gentleRpc/tree/master/examples) and
[tests](https://github.com/timonson/gentleRpc/tree/master/tests) folders for
more detailed examples.
