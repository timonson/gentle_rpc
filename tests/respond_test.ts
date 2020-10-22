// Examples from: https://www.jsonrpc.org/specification#examples

import {
  assertEquals,
  assertNotEquals,
  assertThrows,
} from "https://deno.land/std/testing/asserts.ts";

import { respond } from "../respond.ts";

import type { ServerRequest } from "https://deno.land/std/http/server.ts";

const methods = {
  subtract: (input: any) =>
    Array.isArray(input)
      ? input[0] - input[1]
      : input.minuend - input.subtrahend,
  sum: (arr: number[]) => arr.reduce((acc, el) => acc + el),
  queryDatabase: ([name, additionalArg]: [string, { query: string }]) =>
    `${additionalArg.query} ${name}`,
  notify_hello: () => "hello",
  get_data: () => ["hello", 5],
};

function createReq(str: string) {
  return {
    respond: () => {},
    body: new Deno.Buffer(new TextEncoder().encode(str).buffer as ArrayBuffer),
  } as any;
}
function removeWhiteSpace(str: string) {
  return JSON.stringify(JSON.parse(str));
}

Deno.test("rpc call with positional parameters", async function (): Promise<
  void
> {
  const sentToServer =
    '{"jsonrpc": "2.0", "method": "subtract", "params": [42, 23], "id": 1}';
  const sentToClient = '{"jsonrpc": "2.0", "result": 19, "id": 1}';

  assertEquals(
    await respond(createReq(sentToServer), methods),
    removeWhiteSpace(sentToClient),
  );
});

Deno.test("rpc call with named parameters", async function (): Promise<void> {
  const sentToServer =
    '{"jsonrpc": "2.0", "method": "subtract", "params": {"subtrahend": 23, "minuend": 42}, "id": 3}';
  const sentToClient = '{"jsonrpc": "2.0", "result": 19, "id": 3}';

  assertEquals(
    await respond(createReq(sentToServer), methods),
    removeWhiteSpace(sentToClient),
  );
});

Deno.test(
  "rpc call with additional argument from server",
  async function (): Promise<void> {
    const sentToServer =
      '{"jsonrpc": "2.0", "method": "queryDatabase", "params": ["Joe"], "id": "a"}';
    const sentToClient =
      '{"jsonrpc": "2.0", "result": "DB query result: Joe", "id": "a"}';

    assertEquals(
      await respond(createReq(sentToServer), methods, {
        additionalArgument: { query: "DB query result:" },
      }),
      removeWhiteSpace(sentToClient),
    );
  },
);

Deno.test("rpc call as a notification", async function (): Promise<void> {
  let sentToServer =
    '{"jsonrpc": "2.0", "method": "update", "params": [1,2,3,4,5]}';

  assertEquals(await respond(createReq(sentToServer), methods), undefined);

  sentToServer = '{"jsonrpc": "2.0", "method": "foobar"}';
  assertEquals(await respond(createReq(sentToServer), methods), undefined);
});

Deno.test("rpc call of non-existent method", async function (): Promise<void> {
  const sentToServer = '{"jsonrpc": "2.0", "method": "foobar", "id": "1"}';
  const sentToClient =
    '{"jsonrpc": "2.0", "error": {"code": -32601, "message": "Method not found"}, "id": "1"}';

  assertEquals(
    await respond(createReq(sentToServer), methods),
    removeWhiteSpace(sentToClient),
  );
});

Deno.test("rpc call with invalid JSON", async function (): Promise<void> {
  const sentToServer =
    '{"jsonrpc": "2.0", "method": "foobar, "params": "bar", "baz]';
  const sentToClient =
    '{"jsonrpc": "2.0", "error": {"code": -32700, "message": "Parse error"}, "id": null}';

  assertEquals(
    await respond(createReq(sentToServer), methods),
    removeWhiteSpace(sentToClient),
  );
});

Deno.test("rpc call with invalid Request object", async function (): Promise<
  void
> {
  const sentToServer = '{"jsonrpc": "2.0", "method": 1, "params": "bar"}';
  const sentToClient =
    '{"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null}';

  assertEquals(
    await respond(createReq(sentToServer), methods),
    removeWhiteSpace(sentToClient),
  );
});

Deno.test("rpc call Batch, invalid JSON", async function (): Promise<void> {
  const sentToServer =
    '[ {"jsonrpc": "2.0", "method": "sum", "params": [1,2,4], "id": "1"}, {"jsonrpc": "2.0", "method" ]';
  const sentToClient =
    '{"jsonrpc": "2.0", "error": {"code": -32700, "message": "Parse error"}, "id": null}';

  assertEquals(
    await respond(createReq(sentToServer), methods),
    removeWhiteSpace(sentToClient),
  );
});

Deno.test("rpc call with an empty Array", async function (): Promise<void> {
  const sentToServer = "[]";
  const sentToClient =
    '{"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null}';

  assertEquals(
    await respond(createReq(sentToServer), methods),
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
      await respond(createReq(sentToServer), methods),
      removeWhiteSpace(sentToClient),
    );
  },
);

Deno.test("rpc call with invalid Batch", async function (): Promise<void> {
  const sentToServer = "[1,2,3]";
  const sentToClient =
    '[ {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null}, {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null}, {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null} ]';

  assertEquals(
    await respond(createReq(sentToServer), methods),
    removeWhiteSpace(sentToClient),
  );
});

Deno.test("rpc call Batch", async function (): Promise<void> {
  const sentToServer =
    '[ {"jsonrpc": "2.0", "method": "sum", "params": [1,2,4], "id": "1"}, {"jsonrpc": "2.0", "method": "notify_hello", "params": [7]}, {"jsonrpc": "2.0", "method": "subtract", "params": [42,23], "id": "2"}, {"foo": "boo"}, {"jsonrpc": "2.0", "method": "foo.get", "params": {"name": "myself"}, "id": "5"}, {"jsonrpc": "2.0", "method": "get_data", "id": "9"} ]';
  const sentToClient =
    '[ {"jsonrpc": "2.0", "result": 7, "id": "1"}, {"jsonrpc": "2.0", "result": 19, "id": "2"}, {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null}, {"jsonrpc": "2.0", "error": {"code": -32601, "message": "Method not found"}, "id": "5"}, {"jsonrpc": "2.0", "result": ["hello", 5], "id": "9"} ]';

  assertEquals(
    await respond(createReq(sentToServer), methods),
    removeWhiteSpace(sentToClient),
  );
});

Deno.test("rpc call Batch (all notifications)", async function (): Promise<
  void
> {
  const sentToServer =
    '[ {"jsonrpc": "2.0", "method": "notify_sum", "params": [1,2,4]}, {"jsonrpc": "2.0", "method": "notify_hello", "params": [7]} ]';

  assertEquals(await respond(createReq(sentToServer), methods), undefined);
});
