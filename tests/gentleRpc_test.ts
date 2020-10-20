import {
  assertEquals,
  assertThrowsAsync,
} from "https://deno.land/std@0.71.0/testing/asserts.ts";
import { handleData } from "../rpcServer.ts";
import { createRemote, createRpcRequestObj } from "../rpcClient.ts";
import { createRpcBatchObj, processBatch } from "../batchRequest.ts";

import type { JsonValue } from "../jsonRpc2Types.ts";
import type { ServerRequest } from "https://deno.land/std@0.71.0/http/server.ts";

function subtract(minuend: number, subtrahend: number) {
  return minuend - subtrahend;
}
function sum({ summand1, summand2 }: { summand1: number; summand2: number }) {
  return summand1 + summand2;
}
function sayHello(w: string) {
  return [`Hello ${w || "World"}`];
}

Deno.test("makeRpcCallWithPositionalParameters", async function (): Promise<
  void
> {
  const objSentToServer =
    '{"jsonrpc": "2.0", "method": "subtract", "params": [42, 23], "id": 1}';
  const objSentToClient = '{"jsonrpc": "2.0", "result": 19, "id": 1}';
  assertEquals(
    createRpcRequestObj("subtract", [42, 23], 1),
    JSON.parse(objSentToServer),
  );
  assertEquals(
    await handleData(objSentToServer, { subtract }),
    JSON.parse(objSentToClient),
  );
});

Deno.test("makeRpcCallWithNamedParameters", async function (): Promise<void> {
  const objSentToServer =
    '{"jsonrpc": "2.0", "method": "sum", "params": {"summand1": 23, "summand2": 42}, "id": "4"}';
  const objSentToClient = '{"jsonrpc": "2.0", "result": 65, "id": "4"}';
  assertEquals(
    createRpcRequestObj("sum", { summand1: 23, summand2: 42 }, "4"),
    JSON.parse(objSentToServer),
  );
  assertEquals(
    await handleData(objSentToServer, { sum }),
    JSON.parse(objSentToClient),
  );
});

Deno.test("makeRpcCallWithInvalidParameters", async function (): Promise<void> {
  const objSentToServer =
    '{"jsonrpc": "2.0", "method": "sum", "params": "invalid", "id": "4"}';
  assertEquals(await handleData(objSentToServer, { sum }), {
    jsonrpc: "2.0",
    error: { code: -32602, message: "Invalid parameters" },
    id: "4",
  });
});

Deno.test("makeRpcCallWithNoArguments", async function (): Promise<void> {
  const objSentToServer =
    '{"jsonrpc": "2.0", "method": "sayHello", "id": "abc01"}';
  const objSentToClient =
    '{"jsonrpc": "2.0", "result": ["Hello World"], "id": "abc01"}';
  assertEquals(
    createRpcRequestObj("sayHello", undefined, "abc01"),
    JSON.parse(objSentToServer),
  );
  assertEquals(
    await handleData(objSentToServer, { sayHello }),
    JSON.parse(objSentToClient),
  );
});

Deno.test("makeRpcCallAsNotification", async function (): Promise<void> {
  const objSentToServer =
    '{"jsonrpc": "2.0", "method": "subtract", "params": [42, 23]}';
  const objSentToClient = assertEquals(
    createRpcRequestObj("subtract", [42, 23]),
    JSON.parse(objSentToServer),
  );
  assertEquals(await handleData(objSentToServer, { subtract }), null);
});

Deno.test("makeRpcCallOfNonExistentMethod", async function (): Promise<void> {
  const objSentToServer = '{"jsonrpc": "2.0", "method": "foobar", "id": "1"}';
  const objSentToClient =
    '{"jsonrpc": "2.0", "error": {"code": -32601, "message": "Method not found"}, "id": "1"}';
  const foobar = null;
  assertEquals(
    createRpcRequestObj("foobar", undefined, "1"),
    JSON.parse(objSentToServer),
  );
  assertEquals(
    // @ts-ignore
    await handleData(objSentToServer, { foobar }),
    JSON.parse(objSentToClient),
  );
});

Deno.test("makeRpcCallWithInvalidJson", async function (): Promise<void> {
  const objSentToServer =
    '{"jsonrpc": "2.0", "method": "foobar, "params": "bar", "baz]';
  const objSentToClient =
    '{"jsonrpc": "2.0", "error": {"code": -32700, "message": "Parse error"}, "id": null}';
  assertEquals(
    await handleData(objSentToServer, { subtract }),
    JSON.parse(objSentToClient),
  );
});

Deno.test("makeRpcCallWithInvalidRequestObject", async function (): Promise<
  void
> {
  const objSentToServer = '{"jsonrpc": "2.0", "method": 1, "params": "bar"}';
  const objSentToClient =
    '{"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null}';
  assertEquals(
    await handleData(objSentToServer, { subtract }),
    JSON.parse(objSentToClient),
  );
});

Deno.test("makeRpcBatchCallWithInvalidJson", async function (): Promise<void> {
  const objSentToServer =
    '{"jsonrpc": "2.0", "method": "sum", "params": [1,2,4], "id": "1"}, {"jsonrpc": "2.0", "method"';
  const objSentToClient =
    '{"jsonrpc": "2.0", "error": {"code": -32700, "message": "Parse error"}, "id": null}';
  assertEquals(
    await handleData(objSentToServer, { subtract }),
    JSON.parse(objSentToClient),
  );
});

Deno.test("makeRpcCallWithEmptyArray", async function (): Promise<void> {
  const objSentToServer = "[]";
  const objSentToClient =
    '{"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null}';
  assertEquals(
    await handleData(objSentToServer, { subtract }),
    JSON.parse(objSentToClient),
  );
});

Deno.test("makeRpcBatchCallWithInvalidBatch", async function (): Promise<void> {
  const objSentToServer = "[1]";
  const objSentToClient =
    ' [ {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null} ]';
  assertEquals(
    await handleData(objSentToServer, { subtract }),
    JSON.parse(objSentToClient),
  );
  const objSentToServer2 = "[1,2,3]";
  const objSentToClient2 =
    '[ {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null}, {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null}, {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null} ]';
  assertEquals(
    await handleData(objSentToServer2, { subtract }),
    JSON.parse(objSentToClient2),
  );
});

Deno.test("makeRpcBatchCallsAsNotifications", async function (): Promise<void> {
  const objSentToServer = `
[
        {"jsonrpc": "2.0", "method": "sum", "params": {"summand1":10, "summand2":20}},
        {"jsonrpc": "2.0", "method": "subtract", "params": [42,23]},
        {"jsonrpc": "2.0", "method": "sayHello"} 
    ]
`;
  const objSentToClient = null;
  assertEquals(
    createRpcBatchObj([
      ["sum", { summand1: 10, summand2: 20 }],
      ["subtract", [42, 23]],
      ["sayHello"],
    ]),
    JSON.parse(objSentToServer),
  );
  assertEquals(
    await handleData(objSentToServer, { subtract, sum, sayHello }),
    objSentToClient,
  );
});

Deno.test("makeRpcBatchCallWithIds", async function (): Promise<void> {
  const objSentToServer = `
[
        {"jsonrpc": "2.0", "method": "sum", "params": {"summand1":10, "summand2":20}, "id":"a1"},
        {"jsonrpc": "2.0", "method": "subtract", "params": [42,23], "id": "a2"},
        {"jsonrpc": "2.0", "method": "sayHello", "id": "a3"} 
    ]
`;
  const objSentToClient =
    ' [ {"jsonrpc": "2.0", "result": 30, "id": "a1"}, {"jsonrpc": "2.0", "result": 19, "id": "a2"}, {"jsonrpc": "2.0", "result": ["Hello World"], "id": "a3"} ] ';
  assertEquals(
    createRpcBatchObj({
      a1: ["sum", { summand1: 10, summand2: 20 }],
      a2: ["subtract", [42, 23]],
      a3: ["sayHello"],
    }),
    JSON.parse(objSentToServer),
  );
  assertEquals(
    await handleData(objSentToServer, { subtract, sum, sayHello }),
    JSON.parse(objSentToClient),
  );
});

Deno.test("makeRpcBatchCall", async function (): Promise<void> {
  const objSentToServer1 =
    '[ {"jsonrpc": "2.0", "method": "sum", "params": {"summand1":10,"summand2":20}, "id": "1"}, {"jsonrpc": "2.0", "method": "subtract", "params": [42,23], "id": "2"}, {"jsonrpc": "2.0", "method": "foo.get", "params": {"name": "myself"}, "id": "5"}]';
  assertEquals(
    createRpcBatchObj({
      "1": ["sum", { summand1: 10, summand2: 20 }],
      "2": ["subtract", [42, 23]],
      "5": ["foo.get", { name: "myself" }],
    }),
    JSON.parse(objSentToServer1),
  );
  const objSentToServer2 =
    '[ {"jsonrpc": "2.0", "method": "sum", "params": {"summand1":10,"summand2":20}, "id": "1"}, {"jsonrpc": "2.0", "method": "sayHello", "params": ["World"]}, {"jsonrpc": "2.0", "method": "subtract", "params": [42,23], "id": "2"}, {"foo": "boo"}, {"jsonrpc": "2.0", "method": "foo.get", "params": {"name": "myself"}, "id": "5"}, {"jsonrpc": "2.0", "method": "sayHello", "id": "9"} ]';
  const objSentToClient2 =
    '[ {"jsonrpc": "2.0", "result": 30, "id": "1"}, {"jsonrpc": "2.0", "result": 19, "id": "2"}, {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null}, {"jsonrpc": "2.0", "error": {"code": -32601, "message": "Method not found"}, "id": "5"}, {"jsonrpc": "2.0", "result": ["Hello World"], "id": "9"} ]';
  assertEquals(
    await handleData(objSentToServer2, { subtract, sum, sayHello }),
    JSON.parse(objSentToClient2),
  );
});

Deno.test("processAndValidateBatchObjects", async function (): Promise<void> {
  const objSentToClient =
    '[ {"jsonrpc": "2.0", "result": 30, "id": "100"}, {"jsonrpc": "2.0", "result": 19, "id": "200"} ] ';
  const objClient = '{"100":["sum",[10,20]], "200":["subtract",[20,1]]}';
  assertEquals(
    await processBatch(JSON.parse(objClient), JSON.parse(objSentToClient)),
    JSON.parse('{"100":30,"200":19}'),
  );
});

Deno.test("processAndValidateBatchArrays", async function (): Promise<void> {
  const objSentToClient =
    '[ {"jsonrpc": "2.0", "result": 30, "id": "100"}, {"jsonrpc": "2.0", "result": 19, "id": "200"}, {"jsonrpc": "2.0", "result": "Hello World", "id":"d"} ] ';
  const objClient = '[["sum",[10,20]], ["subtract",[20,1]], ["sayHello"]]';
  assertEquals(
    await processBatch(JSON.parse(objClient), JSON.parse(objSentToClient)),
    JSON.parse('[30,19,"Hello World"]'),
  );
  const objSentToClient2 =
    '[ {"jsonrpc": "2.0", "result": 30, "id": "1"}, {"jsonrpc": "2.0", "result": 19, "id": "2"}, {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null}, {"jsonrpc": "2.0", "error": {"code": -32601, "message": "Method not found"}, "id": "5"}, {"jsonrpc": "2.0", "result": ["Hello World"], "id": "9"} ]';
  const objClient2 =
    '[["sum",[10,20]],["sum",[10,20]],["sum",[10,20]],["sum",[10,20]],["sum",[10,20]]]';
  assertEquals(
    await processBatch(
      JSON.parse(objClient2),
      JSON.parse(objSentToClient2),
    ).catch((err: any) => err.message),
    "Invalid Request",
  );
});
