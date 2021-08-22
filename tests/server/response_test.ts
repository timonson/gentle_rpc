import {
  assertEquals,
  assertNotEquals,
  assertThrowsAsync,
  create,
  ServerRequest,
} from "../test_deps.ts";
import { respond } from "../../server/response.ts";
import { CustomError } from "../../server/custom_error.ts";

function createReq(str: string) {
  return {
    respond: () => {},
    body: new Deno.Buffer(new TextEncoder().encode(str).buffer),
    headers: new Headers([["Some", "Header"]]),
  } as any;
}

function removeWhiteSpace(str: string) {
  return JSON.stringify(JSON.parse(str));
}

const methods = {
  subtract: (input: any) =>
    Array.isArray(input)
      ? input[0] - input[1]
      : input.minuend - input.subtrahend,
  sum: (arr: number[]) => arr.reduce((acc, el) => acc + el),
  queryDatabase: ({ name, s }: { name: string; s: string }) => `${s} ${name}`,
  notify_hello: () => "hello",
  get_data: () => ["hello", 5],
  throwError: () => {
    throw new Error("my error");
  },
  throwCustomError: () => {
    throw new CustomError(-32000, "my custom error", {
      "details": "error details",
    });
  },
  login: (payload: { user: string }) => {
    return payload.user;
  },
};

const key = await crypto.subtle.generateKey(
  { name: "HMAC", hash: "SHA-384" },
  true,
  ["sign", "verify"],
);
const jwt = await create({ alg: "HS384", typ: "JWT" }, { user: "Bob" }, key);

Deno.test("rpc call with positional parameters", async function (): Promise<
  void
> {
  const sentToServer =
    '{"jsonrpc": "2.0", "method": "subtract", "params": [42, 23], "id": 1}';
  const sentToClient = '{"jsonrpc": "2.0", "result": 19, "id": 1}';

  assertEquals(
    await respond(methods, createReq(sentToServer)),
    removeWhiteSpace(sentToClient),
  );
});

Deno.test("rpc call with named parameters", async function (): Promise<void> {
  const sentToServer =
    '{"jsonrpc": "2.0", "method": "subtract", "params": {"subtrahend": 23, "minuend": 42}, "id": 3}';
  const sentToClient = '{"jsonrpc": "2.0", "result": 19, "id": 3}';

  assertEquals(
    await respond(methods, createReq(sentToServer)),
    removeWhiteSpace(sentToClient),
  );
});

Deno.test("rpc call as a notification", async function (): Promise<void> {
  let sentToServer =
    '{"jsonrpc": "2.0", "method": "update", "params": [1,2,3,4,5]}';

  assertEquals(await respond(methods, createReq(sentToServer)), undefined);

  sentToServer = '{"jsonrpc": "2.0", "method": "foobar"}';
  assertEquals(await respond(methods, createReq(sentToServer)), undefined);
});

Deno.test("rpc call of non-existent method", async function (): Promise<void> {
  const sentToServer = '{"jsonrpc": "2.0", "method": "foobar", "id": "1"}';
  const sentToClient =
    '{"jsonrpc": "2.0", "error": {"code": -32601, "message": "Method not found"}, "id": "1"}';

  assertEquals(
    await respond(methods, createReq(sentToServer)),
    removeWhiteSpace(sentToClient),
  );
});

Deno.test("rpc call with invalid request object", async function (): Promise<
  void
> {
  const sentToServer = '{"jsonrpc": "2.0", "method": 1, "params": "bar"}';
  const sentToClient =
    '{"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null}';

  assertEquals(
    await respond(methods, createReq(sentToServer)),
    removeWhiteSpace(sentToClient),
  );
});

Deno.test("rpc call, invalid params", async function (): Promise<void> {
  const sentToServer =
    '{"jsonrpc": "2.0", "method": "subtract", "params": 42, "id": 1}';
  const sentToClient =
    '{"jsonrpc": "2.0", "error": {"code": -32602, "message": "Invalid params"}, "id": 1}';

  assertEquals(
    await respond(methods, createReq(sentToServer)),
    removeWhiteSpace(sentToClient),
  );
});

Deno.test("rpc call, internal error", async function (): Promise<void> {
  const sentToServer =
    '{"jsonrpc": "2.0", "method": "throwError", "params": ["error"], "id": 1}';
  const sentToClient =
    '{"jsonrpc": "2.0", "error": {"code": -32603, "message": "Internal error"}, "id": 1}';

  assertEquals(
    await respond(methods, createReq(sentToServer)),
    removeWhiteSpace(sentToClient),
  );
});

Deno.test("rpc call with invalid JSON", async function (): Promise<void> {
  const sentToServer =
    '{"jsonrpc": "2.0", "method": "foobar, "params": "bar", "baz]';
  const sentToClient =
    '{"jsonrpc": "2.0", "error": {"code": -32700, "message": "Parse error"}, "id": null}';

  assertEquals(
    await respond(methods, createReq(sentToServer)),
    removeWhiteSpace(sentToClient),
  );
});

Deno.test("rpc call Batch, invalid JSON", async function (): Promise<void> {
  const sentToServer =
    '[ {"jsonrpc": "2.0", "method": "sum", "params": [1,2,4], "id": "1"}, {"jsonrpc": "2.0", "method" ]';
  const sentToClient =
    '{"jsonrpc": "2.0", "error": {"code": -32700, "message": "Parse error"}, "id": null}';

  assertEquals(
    await respond(methods, createReq(sentToServer)),
    removeWhiteSpace(sentToClient),
  );
});

Deno.test("rpc call with an empty Array", async function (): Promise<void> {
  const sentToServer = "[]";
  const sentToClient =
    '{"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null}';

  assertEquals(
    await respond(methods, createReq(sentToServer)),
    removeWhiteSpace(sentToClient),
  );
});

Deno.test(
  "rpc call with an invalid Batch (but not empty)",
  async function (): Promise<void> {
    const sentToServer = "[1]";
    const sentToClient =
      '[ {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null} ]';

    assertEquals(
      await respond(methods, createReq(sentToServer)),
      removeWhiteSpace(sentToClient),
    );
  },
);

Deno.test("rpc call with invalid Batch", async function (): Promise<void> {
  const sentToServer = "[1,2,3]";
  const sentToClient =
    '[ {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null}, {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null}, {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null} ]';

  assertEquals(
    await respond(methods, createReq(sentToServer)),
    removeWhiteSpace(sentToClient),
  );
});

Deno.test("rpc call Batch", async function (): Promise<void> {
  const sentToServer =
    '[ {"jsonrpc": "2.0", "method": "sum", "params": [1,2,4], "id": "1"}, {"jsonrpc": "2.0", "method": "notify_hello", "params": [7]}, {"jsonrpc": "2.0", "method": "subtract", "params": [42,23], "id": "2"}, {"foo": "boo"}, {"jsonrpc": "2.0", "method": "foo.get", "params": {"name": "myself"}, "id": "5"}, {"jsonrpc": "2.0", "method": "get_data", "id": "9"} ]';
  const sentToClient =
    '[ {"jsonrpc": "2.0", "result": 7, "id": "1"}, {"jsonrpc": "2.0", "result": 19, "id": "2"}, {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null}, {"jsonrpc": "2.0", "error": {"code": -32601, "message": "Method not found"}, "id": "5"}, {"jsonrpc": "2.0", "result": ["hello", 5], "id": "9"} ]';

  assertEquals(
    await respond(methods, createReq(sentToServer)),
    removeWhiteSpace(sentToClient),
  );
});

Deno.test("rpc call Batch (all notifications)", async function (): Promise<
  void
> {
  const sentToServer =
    '[ {"jsonrpc": "2.0", "method": "notify_sum", "params": [1,2,4]}, {"jsonrpc": "2.0", "method": "notify_hello", "params": [7]} ]';

  assertEquals(await respond(methods, createReq(sentToServer)), undefined);
});

Deno.test(
  "rpc call with additional argument from server",
  async function (): Promise<void> {
    const sentToServer =
      '{"jsonrpc": "2.0", "method": "queryDatabase", "params": {"name":"Joe"}, "id": "a"}';
    const sentToClient =
      '{"jsonrpc": "2.0", "result": "DB query result: Joe", "id": "a"}';

    assertEquals(
      await respond(methods, createReq(sentToServer), {
        additionalArguments: [{
          args: { s: "DB query result:" },
          allMethods: true,
        }],
      }),
      removeWhiteSpace(sentToClient),
    );
    assertEquals(
      await respond(methods, createReq(sentToServer), {
        additionalArguments: [{
          args: { s: "DB query result:" },
          methods: ["queryDatabase"],
        }],
      }),
      removeWhiteSpace(sentToClient),
    );
    assertEquals(
      await respond(methods, createReq(sentToServer), {
        additionalArguments: [{
          args: { s: "DB query result:" },
        }],
      }),
      removeWhiteSpace(
        '{"jsonrpc": "2.0", "result": "undefined Joe", "id": "a"}',
      ),
    );
    assertEquals(
      await respond(
        methods,
        createReq(
          '{"jsonrpc": "2.0", "method": "queryDatabase", "params": ["Joe"], "id": "a"}',
        ),
        {
          additionalArguments: [{
            args: { s: "DB query result:" },
            allMethods: true,
          }],
        },
      ),
      removeWhiteSpace(
        '{"jsonrpc": "2.0", "error": {"code": -32010, "message": "Server error"}, "id": "a"}',
      ),
    );
  },
);

Deno.test("set publicErrorStack to true", async function (): Promise<void> {
  const sentToServer = '{"jsonrpc": "2.0", "method": "throwError", "id": 3}';
  const sentToClient = '{"jsonrpc": "2.0", "result": 19, "id": 3}';

  assertEquals(
    typeof JSON.parse(
      (await respond(methods, createReq(sentToServer))) as string,
    ).error.data,
    "undefined",
  );
  assertEquals(
    typeof JSON.parse(
      (await respond(methods, createReq(sentToServer), {
        publicErrorStack: true,
      })) as string,
    ).error.data,
    "string",
  );
});

Deno.test("rpc call with a custom error", async function (): Promise<
  void
> {
  const sentToServer =
    '{"jsonrpc": "2.0", "method": "throwCustomError", "params": [], "id": 1}';
  const sentToClient =
    '{"jsonrpc":"2.0","error":{"code":-32000,"message":"my custom error","data":{"details":"error details"}},"id":1}';

  assertEquals(
    await respond(methods, createReq(sentToServer)),
    removeWhiteSpace(sentToClient),
  );
});

Deno.test("rpc call with jwt", async function (): Promise<void> {
  const sentToServer = '{"jsonrpc": "2.0", "method": "login", "id": 3}';
  const sentToClient = '{"jsonrpc": "2.0", "result": "Bob", "id": 3}';
  const reqOne = createReq(sentToServer);
  reqOne.headers = new Headers({
    "Authorization": `Bearer ${jwt}`,
  });
  assertEquals(
    await respond(methods, reqOne, {
      headers: new Headers({
        "Authorization": `Bearer ${jwt}`,
      }),
      auth: { key, methods: ["login"] },
    }),
    removeWhiteSpace(sentToClient),
  );
  const reqTwo = createReq(sentToServer);
  reqTwo.headers = new Headers({
    "Authorization": `Bearer ${jwt.slice(1)}`,
  });
  assertEquals(
    await respond(methods, reqTwo, {
      auth: { key, methods: ["login"] },
    }),
    removeWhiteSpace(
      '{"jsonrpc": "2.0", "error": {"code": -32020, "message": "Server error"}, "id": 3}',
    ),
  );
  const reqThree = createReq(
    '{"jsonrpc": "2.0", "method": "login", "params": {"user": "Bob"}, "id": 3}',
  );
  reqThree.headers = new Headers({
    "Authorization": `Bearer ${jwt.slice(1)}`,
  });
  assertEquals(
    await respond(methods, reqThree, {
      auth: { key, methods: ["notify_hello"], allMethods: true },
    }),
    removeWhiteSpace(
      '{"jsonrpc": "2.0", "error": {"code": -32020, "message": "Server error"}, "id": 3}',
    ),
  );
  const reqFour = createReq(
    '{"jsonrpc": "2.0", "method": "login", "params": {"user": "Bob"}, "id": 3}',
  );
  assertEquals(
    await respond(methods, reqFour, {
      auth: { key, methods: ["login"], allMethods: true },
    }),
    removeWhiteSpace(
      '{"jsonrpc": "2.0", "error": {"code": -32020, "message": "Server error"}, "id": 3}',
    ),
  );
});
