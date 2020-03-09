import { assertEquals } from "https://deno.land/std/testing/asserts.ts"
import { handleData } from "../rpcServer.ts"
import {
  createRemote,
  send,
  createRpcRequestObj,
  createRpcBatchObj,
} from "../rpcClient.ts"

function subtract(minuend: number, subtrahend: number) {
  return minuend - subtrahend
}
function sum({ summand1, summand2 }: { summand1: number; summand2: number }) {
  return summand1 + summand2
}
function sayHello(w: string) {
  return [`Hello ${w || "World"}`]
}

Deno.test(async function makeRpcCallWithPositionalParameters(): Promise<void> {
  const objSentToServer =
    '{"jsonrpc": "2.0", "method": "subtract", "params": [42, 23], "id": 1}'
  const objSentToClient = '{"jsonrpc": "2.0", "result": 19, "id": 1}'
  assertEquals(
    createRpcRequestObj("subtract", [42, 23], 1),
    JSON.parse(objSentToServer)
  )
  assertEquals(
    await handleData(objSentToServer, { subtract }),
    JSON.parse(objSentToClient)
  )
})

Deno.test(async function makeRpcCallWithNamedParameters(): Promise<void> {
  const objSentToServer =
    '{"jsonrpc": "2.0", "method": "sum", "params": {"summand1": 23, "summand2": 42}, "id": "4"}'
  const objSentToClient = '{"jsonrpc": "2.0", "result": 65, "id": "4"}'
  assertEquals(
    createRpcRequestObj("sum", { summand1: 23, summand2: 42 }, "4"),
    JSON.parse(objSentToServer)
  )
  assertEquals(
    await handleData(objSentToServer, { sum }),
    JSON.parse(objSentToClient)
  )
})

Deno.test(async function makeRpcCallWithNoArguments(): Promise<void> {
  const objSentToServer =
    '{"jsonrpc": "2.0", "method": "sayHello", "id": "abc01"}'
  const objSentToClient =
    '{"jsonrpc": "2.0", "result": ["Hello World"], "id": "abc01"}'
  assertEquals(
    createRpcRequestObj("sayHello", undefined, "abc01"),
    JSON.parse(objSentToServer)
  )
  assertEquals(
    await handleData(objSentToServer, { sayHello }),
    JSON.parse(objSentToClient)
  )
})

Deno.test(async function makeRpcCallAsNotification(): Promise<void> {
  const objSentToServer =
    '{"jsonrpc": "2.0", "method": "subtract", "params": [42, 23]}'
  const objSentToClient = assertEquals(
    createRpcRequestObj("subtract", [42, 23]),
    JSON.parse(objSentToServer)
  )
  assertEquals(await handleData(objSentToServer, { subtract }), null)
})

Deno.test(async function makeRpcCallOfNonExistentMethod(): Promise<void> {
  const objSentToServer = '{"jsonrpc": "2.0", "method": "foobar", "id": "1"}'
  const objSentToClient =
    '{"jsonrpc": "2.0", "error": {"code": -32601, "message": "Method not found"}, "id": "1"}'
  const foobar = null
  assertEquals(
    createRpcRequestObj("foobar", undefined, "1"),
    JSON.parse(objSentToServer)
  )
  assertEquals(
    // @ts-ignore
    await handleData(objSentToServer, { foobar }),
    JSON.parse(objSentToClient)
  )
})

Deno.test(async function makeRpcCallWithInvalidJson(): Promise<void> {
  const objSentToServer =
    '{"jsonrpc": "2.0", "method": "foobar, "params": "bar", "baz]'
  const objSentToClient =
    '{"jsonrpc": "2.0", "error": {"code": -32700, "message": "Parse error"}, "id": null}'
  assertEquals(
    await handleData(objSentToServer, { subtract }),
    JSON.parse(objSentToClient)
  )
})

Deno.test(async function makeRpcResponseIncludingErrorStack(): Promise<void> {
  const objSentToServer =
    '{"jsonrpc": "2.0", "method": "foobar, "params": "bar", "baz]'
  const objSentToClient =
    '{"jsonrpc": "2.0", "error": {"code": -32700, "message": "Parse error", "data": {"stack": "Error: Parse error at parseJson"}}, "id": null}'
  assertEquals(
    ((await handleData(objSentToServer, { subtract }, true)) as {
      [key: string]: any
    }).error.data.stack.slice(0, 10),
    JSON.parse(objSentToClient).error.data.stack.slice(0, 10)
  )
})

Deno.test(async function makeRpcCallWithInvalidRequestObject(): Promise<void> {
  const objSentToServer = '{"jsonrpc": "2.0", "method": 1, "params": "bar"}'
  const objSentToClient =
    '{"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null}'
  assertEquals(
    await handleData(objSentToServer, { subtract }),
    JSON.parse(objSentToClient)
  )
})

Deno.test(async function makeRpcBatchCallWithInvalidJson(): Promise<void> {
  const objSentToServer =
    '{"jsonrpc": "2.0", "method": "sum", "params": [1,2,4], "id": "1"}, {"jsonrpc": "2.0", "method"'
  const objSentToClient =
    '{"jsonrpc": "2.0", "error": {"code": -32700, "message": "Parse error"}, "id": null}'
  assertEquals(
    await handleData(objSentToServer, { subtract }),
    JSON.parse(objSentToClient)
  )
})

Deno.test(async function makeRpcCallWithEmptyArray(): Promise<void> {
  const objSentToServer = "[]"
  const objSentToClient =
    '{"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null}'
  assertEquals(
    await handleData(objSentToServer, { subtract }),
    JSON.parse(objSentToClient)
  )
})

Deno.test(async function makeRpcBatchCallWithInvalidBatch(): Promise<void> {
  const objSentToServer = "[1]"
  const objSentToClient =
    ' [ {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null} ]'
  assertEquals(
    await handleData(objSentToServer, { subtract }),
    JSON.parse(objSentToClient)
  )
  const objSentToServer2 = "[1,2,3]"
  const objSentToClient2 =
    '[ {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null}, {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null}, {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null} ]'
  assertEquals(
    await handleData(objSentToServer2, { subtract }),
    JSON.parse(objSentToClient2)
  )
})

Deno.test(async function makeRpcBatchCallsAsNotifications(): Promise<void> {
  const objSentToServer = `
[
        {"jsonrpc": "2.0", "method": "sum", "params": {"summand1":10, "summand2":20}},
        {"jsonrpc": "2.0", "method": "subtract", "params": [42,23]},
        {"jsonrpc": "2.0", "method": "sayHello"} 
    ]
`
  const objSentToClient = null
  assertEquals(
    createRpcBatchObj(
      [
        ["sum", { summand1: 10, summand2: 20 }],
        ["subtract", [42, 23]],
        ["sayHello"],
      ],
      true
    ),
    JSON.parse(objSentToServer)
  )
  assertEquals(
    await handleData(objSentToServer, { subtract, sum, sayHello }),
    objSentToClient
  )
})

Deno.test(async function makeRpcBatchCallWithIds(): Promise<void> {
  const objSentToServer = `
[
        {"jsonrpc": "2.0", "method": "sum", "params": {"summand1":10, "summand2":20}, "id":"a1"},
        {"jsonrpc": "2.0", "method": "subtract", "params": [42,23], "id": "a2"},
        {"jsonrpc": "2.0", "method": "sayHello", "id": "a3"} 
    ]
`
  const objSentToClient =
    ' [ {"jsonrpc": "2.0", "result": 30, "id": "a1"}, {"jsonrpc": "2.0", "result": 19, "id": "a2"}, {"jsonrpc": "2.0", "result": ["Hello World"], "id": "a3"} ] '
  assertEquals(
    createRpcBatchObj({
      a1: ["sum", { summand1: 10, summand2: 20 }],
      a2: ["subtract", [42, 23]],
      a3: ["sayHello"],
    }),
    JSON.parse(objSentToServer)
  )
  assertEquals(
    await handleData(objSentToServer, { subtract, sum, sayHello }),
    JSON.parse(objSentToClient)
  )
})

Deno.test(async function makeRpcBatchCall(): Promise<void> {
  const objSentToServer =
    '[ {"jsonrpc": "2.0", "method": "sum", "params": {"summand1":10,"summand2":20}, "id": "1"}, {"jsonrpc": "2.0", "method": "sayHello", "params": ["World"]}, {"jsonrpc": "2.0", "method": "subtract", "params": [42,23], "id": "2"}, {"foo": "boo"}, {"jsonrpc": "2.0", "method": "foo.get", "params": {"name": "myself"}, "id": "5"}, {"jsonrpc": "2.0", "method": "sayHello", "id": "9"} ]'
  const objSentToClient =
    ' [ {"jsonrpc": "2.0", "result": 30, "id": "1"}, {"jsonrpc": "2.0", "result": 19, "id": "2"}, {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null}, {"jsonrpc": "2.0", "error": {"code": -32601, "message": "Method not found"}, "id": "5"}, {"jsonrpc": "2.0", "result": ["Hello World"], "id": "9"} ] '
  assertEquals(
    await handleData(objSentToServer, { subtract, sum, sayHello }),
    JSON.parse(objSentToClient)
  )
})

import { ServerRequest } from "https://deno.land/std/http/server.ts"
Deno.test(async function makeRpcCallWithRequestObjectMockAsArgument(): Promise<
  void
> {
  const objSentToServer =
    '{"jsonrpc": "2.0", "method": "sayHello", "params": [],"id": 1}'
  const objSentToClient =
    '{"jsonrpc": "2.0", "result": ["Hello this is the response object duuh"], "id": 1}'
  const responseObjectMock = "this is the response object duuh" as ServerRequest
  assertEquals(
    createRpcRequestObj("sayHello", [], 1),
    JSON.parse(objSentToServer)
  )
  assertEquals(
    await handleData(objSentToServer, { sayHello }, false, responseObjectMock),
    JSON.parse(objSentToClient)
  )
})
// await Deno.runTests()
