# gentle_rpc

JSON-RPC 2.0 library (server and client) with HTTP and WebSockets support for
[deno](https://github.com/denoland/deno) and the browser.

### Important Notice

The **gentle_rpc** library is no longer maintained. Please switch to our new and
improved RPC library, **schicksal**, available at
[schicksal on GitHub](https://github.com/Zaubrik/schicksal).

## Server

### respond

Takes `Methods`, `ServerRequest` and `Options`. Look
[here](https://github.com/timonson/gentle_rpc/blob/master/server/response.ts)
for more information about `Options`.

```typescript
import { serve } from "https://deno.land/std@0.117.0/http/server.ts";
import { respond } from "https://deno.land/x/gentle_rpc/mod.ts";

const rpcMethods = {
  sayHello: ([w]: [string]) => `Hello ${w}`,
  callNamedParameters: ({ a, b, c }: { a: number; b: number; c: string }) =>
    `${c} ${a * b}`,
  animalsMakeNoise: (noise: string[]) =>
    noise.map((el) => el.toUpperCase()).join(" "),
};

serve((req) => respond(rpcMethods, req), { addr: ":8000" });

console.log("Listening on http://localhost:8000");
```

#### CustomError

Throw a `CustomError` to send a server-defined error response.

```typescript
import { CustomError, respond } from "https://deno.land/x/gentle_rpc/mod.ts";

//..
await respond(
  {
    throwError: () => {
      throw new CustomError(
        -32040, // the JSON-RPC error code. Note, must be -32040 to -32099
        "An error occurred", // the error message, a short sentence
        { details: "..." }, // optional additional details, can be any `JsonValue`
      );
    },
  },
  req,
);
//..
```

## Client

#### createRemote

Takes a `Resource` for HTTP or a `WebSocket` for WebSockets and returns
`Remote`.

```typescript
import { createRemote } from "https://deno.land/x/gentle_rpc/mod.ts";
// Or import directly into the browser with:
import { createRemote } from "https://cdn.jsdelivr.net/gh/timonson/gentle_rpc@v3.3/client/dist/remote.js";

// HTTP:
const remote = createRemote("http://0.0.0.0:8000");

// WebSocket:
const remote = await createRemote(new WebSocket("ws://0.0.0.0:8000"));
```

### HTTP

#### call

Takes a string and an `Array<JsonValue>` or `Record<string, JsonValue>` object
and returns `Promise<JsonValue>`.

```typescript
const greeting = await remote.call("sayHello", ["World"]);
// Hello World

const namedParams = await remote.call("callNamedParameters", {
  a: 5,
  b: 10,
  c: "result:",
});
// result: 50
```

##### notification

Using the option `{ isNotification: true }` will retun `Promise<undefined>`.

```typescript
const notification = await remote.call("sayHello", ["World"], {
  isNotification: true,
});
// undefined
```

##### jwt

Adding the option `{jwt: string}` will set the `Authorization` header to
`` `Bearer ${jwt}` ``.

```typescript
const user = await remote.call("login", undefined, { jwt });
// Bob
```

#### batch

```typescript
const noise1 = await remote.batch([
  {
    animalsMakeNoise: [
      ["miaaow"],
      ["wuuuufu", "wuuuufu"],
      ["iaaaiaia", "iaaaiaia", "iaaaiaia"],
      ["fiiiiire"],
    ],
    sayHello: [["World"], undefined, ["World"]],
  },
]);
// [ "MIAAOW", "WUUUUFU WUUUUFU", "IAAAIAIA IAAAIAIA IAAAIAIA", "FIIIIIRE", "Hello World", "Hello ", "Hello World" ]
```

The following example uses the object keys `cat`, `dog`, `donkey`, `dragon` as
RPC _request object ids_ under the hood. The returned _RPC result_ values will
be assigned to these keys.

```typescript
let noise2 = await remote.batch({
  cat: ["sayHello", ["miaaow"]],
  dog: ["animalsMakeNoise", ["wuuuufu"]],
  donkey: ["sayHello"],
  dragon: ["animalsMakeNoise", ["fiiiiire", "fiiiiire"]],
});
// { cat: "Hello miaaow", dog: "WUUUUFU", donkey: "Hello ", dragon: "FIIIIIRE FIIIIIRE" }
```

### WebSockets

#### call

Takes a string and an `Array<JsonValue>` or `Record<string, JsonValue>` object
and returns `Promise<JsonValue>`.

```typescript
const noise = await remote.call("callNamedParameters", {
  a: 10,
  b: 20,
  c: "The result is:",
});
// The result is: 200

remote.socket.close();
```

Notifications return `Promise<undefined>`.

##### notification

```typescript
const notification = await remote.call("animalsMakeNoise", ["wuufff"], {
  isNotification: true,
});
// undefined
```

##### messaging between multiple clients

By using the `subscribe` method you can send messages between multiple clients.
It returns an object with a generator property
`{ generator: AsyncGenerator<JsonValue>}` and the methods `emit` and
`unsubscribe`.

Other clients can _listen to_ and _emit_ messages by _subscribing_ to the same
method.

```typescript
const firstClient = await createRemote(new WebSocket("ws://0.0.0.0:8000"));
const secondClient = await createRemote(new WebSocket("ws://0.0.0.0:8000"));

async function run(iter: AsyncGenerator<unknown>) {
  try {
    for await (let x of iter) {
      console.log(x);
    }
  } catch (err) {
    console.log(err.message, err.code, err.data);
  }
}

const greetingFirst = firstClient.subscribe("sayHello");
const greetingSecond = secondClient.subscribe("sayHello");

run(greetingFirst.generator);
run(greetingSecond.generator);
greetingFirst.emit(["first"]);
greetingSecond.emit(["second"]);
// Hello first
// Hello first
// Hello second
// Hello second
```

## Proxy API

Optionally, you can import _syntactical sugar_ and use a more friendly API
supported by `Proxy` objects.

```typescript
import {
  createRemote,
  HttpProxy,
  httpProxyHandler,
} from "https://deno.land/x/gentle_rpc/mod.ts";

const remote = new Proxy<HttpProxy>(
  createRemote("http://0.0.0.0:8000"),
  httpProxyHandler,
);

let greeting = await remote.sayHello(["World"]);
// Hello World

const namedParams = await remote.callNamedParameters({
  a: 5,
  b: 10,
  c: "result:",
});
// result: 50
```

## Examples and Tests

Please checkout the
[examples](https://github.com/timonson/gentle_rpc/tree/master/examples) and
[tests](https://github.com/timonson/gentle_rpc/tree/master/tests) folders for
more detailed examples.

## Contribution

Every kind of contribution to this project is highly appreciated.\
Please run `deno fmt` on the changed files before making a pull request.
