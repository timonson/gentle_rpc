# gentleRpc

**JSON-RPC 2.0** library for [deno](https://github.com/denoland/deno) and the
browser.

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
import { respondRpc } from "../rpcServer.ts"

const s = serve("0.0.0.0:8000")
const rpcMethods = {
  sayHello: (w: string) => `Hello ${w}`,
  animalsMakeNoise: (noise: string) => noise.toUpperCase(),
}

for await (const req of s) {
  const result = await respondRpc(req, rpcMethods)
  console.log(result)
}
```

#### Client/remote side

```typescript
import { createRemote } from "../rpcClient.ts"
const remote = createRemote("http://0.0.0.0:8000")
const greeting = await remote.sayHello("World") // Hello World
```

## API

#### createRemote(url, options, handleUnsuccessfulResponse)

- `url: string` fetch data from
- `options: object` this object will be merged into default options for _fetch_
  with execption of the two optional properties `notification: boolean` and
  `id: string | number`.
  - `notification` causes the server to make an empty response
  - `id` sets an custom id
- `handleUnsuccessfulResponse: (response: object => any)` this optional callback
  is called, with the to _fetch_ returned response object as argument, if
  _fetch_ was not successful.

#### respondRpc(request, methods, { includeServerErrorStack, callMethodsWithRequestObj })

- request: `ServerRequest`
- methods: `{ [method: string]: (...args: any[]) => any }`
- includeServerErrorStack: `boolean` detemines if the client's error objects may
  contain the server's error stack. Default: `false`
- callMethodsWithRequestObj: `boolean` if true the request object will be added
  the first argument to the method call.

#### remote.method(arguments)

Each method call of the remote object will look for the identically named method
on the server side, where the methods have been defined. It is based on the
native JavaScript **Proxy** object.

The methods return the **result** or **error** property of the RPC response
object as promise.

```typescript
await remote.sayHello("World")
```

Any number of arguments to the method calls is possible.

#### remote.batch(object)

Additionally, to send several request objects at the same time, the client may
send an array filled with request objects. You can do this on two different
ways:

```typescript
const noise1 = await remote.batch([
  ["animalsMakeNoise", "miaaow"],
  ["animalsMakeNoise", "wuuuufu"],
  ["animalsMakeNoise", "iaaaiaia"],
  ["animalsMakeNoise", "fiiiiire"],
])
```

The second example uses the object keys, like _cat, dog, donkey, dragon_, as RPC
**Request Object IDs** under the hood and reassigns the final results to them.
The result might look like this:

```typescript
const noise2 = await remote.batch({
  cat: ["animalsMakeNoise", "miaaow"],
  dog: ["animalsMakeNoise", "wuuuufu"],
  donkey: ["animalsMakeNoise", "iaaaiaia"],
  dragon: ["animalsMakeNoise", "fiiiiire"],
})
// { cat: "MIAAOW", dog: "WUUUUFU", donkey: "IAAAIAIA", dragon: "FIIIIIRE" }
```

Checkout the
[examples](https://github.com/timonson/gentleRpc/tree/master/examples) and
[tests]() folders for more detailed examples.
