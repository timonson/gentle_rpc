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

## Example

Always use versioned imports for your dependencies. For example
`https://deno.land/x/gentle_rpc@v1.6/rpcServer.ts`.

#### Server/deno side

```typescript
import { serve } from "https://deno.land/std@0.74.0/http/server.ts";
import { respond } from "https://deno.land/x/gentle_rpc/respond.ts";

console.log("listening on 0.0.0.0:8000");
const s = serve("0.0.0.0:8000");

const rpcMethods = {
  sayHello: ([w]: [string]) => `Hello ${w}`,
  animalsMakeNoise: ([noise]: [string]) => noise.toUpperCase(),
};

for await (const req of s) {
  await respond(req, rpcMethods);
}
```

#### Client/remote side

```typescript
import { createRemote } from "https://deno.land/x/gentle_rpc/request.ts";

const remote = createRemote("http://0.0.0.0:8000");
const greeting = await remote.sayHello(["World"]);

console.log(greeting); // Hello World
```

## API

### respond(request, methods, { additionalArgument? })

The additional argument is optional.

```typescript
for await (const req of s) {
  await respond(req, rpcMethods, { additionalArgument: db });
}
```

### createRemote(resource, options) => Proxy

- `url: string | URL | Request` the URL to _fetch_ data from.
- `options: Options` this object sets the _fetch_ API options (_RequestInit_).
  Additionally, it contains the two optional properties:
  - `notification` causes the server to make an empty response.
  - `id` defines a custom id.

#### remote.method(value[] | {key: value}) => Promise\<JsonValue | undefined>

Each method call of the remote object will look for the identically named method
on the server side, where the methods are defined.

```typescript
const remote = createRemote("http://0.0.0.0:8000");
await remote.sayHello(["World"]); // Hello World
```

### Batch Requests

#### remote.batch(["method", ["arg1"], ["arg1", "arg2"], ...])

```typescript
await remote.batch([
  "animalsMakeNoise",
  ["miaaow"],
  ["wuuuufu"],
  ["iaaaiaia"],
  ["fiiiiire"],
]);
// [ "MIAAOW", "WUUUUFU", "IAAAIAIA", "FIIIIIRE" ]
```

#### remote.batch({key1: ["method1", ["arg1", "arg2"]], key2: ["method2", ["arg1"]], ...})

This way of making _batch_ requests uses the object keys (_cat, dog, donkey,
dragon_) as RPC _request object ids_ under the hood. The returned _RPC result_
values will be assigned to these keys. Let's take a look at the following
example:

```typescript
const noise2 = await remote.batch({
  cat: ["sayHello", ["miaaow"]],
  dog: ["animalsMakeNoise", ["wuuuufu"]],
  donkey: ["sayHello"],
  dragon: ["animalsMakeNoise", ["fiiiiire"]],
});
// { cat: "Hello miaaow", dog: "WUUUUFU", donkey: "Hello ", dragon: "FIIIIIRE" }
```

## Examples and Tests

Checkout the
[examples](https://github.com/timonson/gentle_rpc/tree/master/examples) and
[tests](https://github.com/timonson/gentle_rpc/tree/master/tests) folders for
more detailed examples.

## Contribution

Every kind of contribution to this project is highly appreciated.  
Please run `deno fmt` on the changed files before making a pull request.
