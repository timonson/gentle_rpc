import { assertEquals } from "https://deno.land/std/testing/asserts.ts"
import { handleData } from "../rpcServer.ts"
import {
  createRemote,
  send,
  createRpcRequestObj,
  createRpcBatchObj,
  Client,
  BadServerDataError,
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

Deno.test("makeRpcCallWithPositionalParameters", async function (): Promise<
  void
> {
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

Deno.test("makeRpcCallWithNamedParameters", async function (): Promise<void> {
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

Deno.test("makeRpcCallWithNoArguments", async function (): Promise<void> {
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

Deno.test("makeRpcCallAsNotification", async function (): Promise<void> {
  const objSentToServer =
    '{"jsonrpc": "2.0", "method": "subtract", "params": [42, 23]}'
  const objSentToClient = assertEquals(
    createRpcRequestObj("subtract", [42, 23]),
    JSON.parse(objSentToServer)
  )
  assertEquals(await handleData(objSentToServer, { subtract }), null)
})

Deno.test("makeRpcCallOfNonExistentMethod", async function (): Promise<void> {
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

Deno.test("makeRpcCallWithInvalidJson", async function (): Promise<void> {
  const objSentToServer =
    '{"jsonrpc": "2.0", "method": "foobar, "params": "bar", "baz]'
  const objSentToClient =
    '{"jsonrpc": "2.0", "error": {"code": -32700, "message": "Parse error"}, "id": null}'
  assertEquals(
    await handleData(objSentToServer, { subtract }),
    JSON.parse(objSentToClient)
  )
})

Deno.test("makeRpcResponseIncludingErrorStack", async function (): Promise<
  void
> {
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

Deno.test("makeRpcCallWithInvalidRequestObject", async function (): Promise<
  void
> {
  const objSentToServer = '{"jsonrpc": "2.0", "method": 1, "params": "bar"}'
  const objSentToClient =
    '{"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null}'
  assertEquals(
    await handleData(objSentToServer, { subtract }),
    JSON.parse(objSentToClient)
  )
})

Deno.test("makeRpcBatchCallWithInvalidJson", async function (): Promise<void> {
  const objSentToServer =
    '{"jsonrpc": "2.0", "method": "sum", "params": [1,2,4], "id": "1"}, {"jsonrpc": "2.0", "method"'
  const objSentToClient =
    '{"jsonrpc": "2.0", "error": {"code": -32700, "message": "Parse error"}, "id": null}'
  assertEquals(
    await handleData(objSentToServer, { subtract }),
    JSON.parse(objSentToClient)
  )
})

Deno.test("makeRpcCallWithEmptyArray", async function (): Promise<void> {
  const objSentToServer = "[]"
  const objSentToClient =
    '{"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null}'
  assertEquals(
    await handleData(objSentToServer, { subtract }),
    JSON.parse(objSentToClient)
  )
})

Deno.test("makeRpcBatchCallWithInvalidBatch", async function (): Promise<void> {
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

Deno.test("makeRpcBatchCallsAsNotifications", async function (): Promise<void> {
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

Deno.test("makeRpcBatchCallWithIds", async function (): Promise<void> {
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

Deno.test("makeRpcBatchCall", async function (): Promise<void> {
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
Deno.test(
  "makeRpcCallWithRequestObjectMockAsArgument",
  async function (): Promise<void> {
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
      await handleData(
        objSentToServer,
        { sayHello },
        false,
        responseObjectMock
      ),
      JSON.parse(objSentToClient)
    )
  }
)

Deno.test("handleResponseObjOnClientSide", async function (): Promise<void> {
  const client = new Client("testUrl")
  const objSentToClient =
    ' [ {"jsonrpc": "2.0", "result": 30, "id": "1"}, {"jsonrpc": "2.0", "result": 19, "id": "2"} ] '
  assertEquals(client.handleResponseData(JSON.parse(objSentToClient)), [30, 19])
})

Deno.test("handleResponseObjOnClientSideWithError", async function (): Promise<
  void
> {
  const client = new Client("testUrl")
  const objSentToClient =
    ' [ {"jsonrpc": "2.0", "result": 30, "id": "1"}, {"jsonrpc": "2.0", "result": 19, "id": "2"}, {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null} ] '
  try {
    var handledResponse = client.handleResponseData(JSON.parse(objSentToClient))
  } catch (err) {
    handledResponse = err
  }
  assertEquals(
    handledResponse,
    new BadServerDataError("Invalid Request", -32600)
  )
})

// await Deno.runTests()
