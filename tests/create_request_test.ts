import { assertEquals, assertNotEquals, assertThrowsAsync } from "./deps.ts";

import { createRequest, createRequestBatch } from "../create_request.ts";

Deno.test("create request object", function (): void {
  assertEquals(
    createRequest({
      method: "subtract",
      params: [42, 23],
      isNotification: true,
    }),
    { jsonrpc: "2.0", method: "subtract", params: [42, 23] },
  );
  assertEquals(
    createRequest({
      method: "subtract",
      params: [42, 23],
      isNotification: true,
      id: 22,
    }),
    { jsonrpc: "2.0", method: "subtract", params: [42, 23] },
  );
  assertEquals(
    createRequest({
      method: "subtract",
      params: { a: 1, b: 2 },
      id: "abc",
    }),
    { jsonrpc: "2.0", method: "subtract", params: { a: 1, b: 2 }, id: "abc" },
  );
  assertEquals(
    createRequest({
      method: "subtract",
      isNotification: false,
      id: 123,
    }),
    { jsonrpc: "2.0", method: "subtract", id: 123 },
  );
  assertNotEquals(
    createRequest({
      method: "subtract",
      params: [42, 23],
    }),
    { jsonrpc: "2.0", method: "subtract", params: [42, 23] },
  );
});

Deno.test("create request batch with array api", function (): void {
  assertEquals(createRequestBatch(["sum", undefined, undefined], true), [
    {
      jsonrpc: "2.0",
      method: "sum",
    },
    {
      jsonrpc: "2.0",
      method: "sum",
    },
  ]);
  assertEquals(createRequestBatch(["sum", ["a", 1], [42, 23]], true), [
    {
      jsonrpc: "2.0",
      method: "sum",
      params: ["a", 1],
    },
    {
      jsonrpc: "2.0",
      method: "sum",
      params: [42, 23],
    },
  ]);
  assertNotEquals(createRequestBatch(["sum", ["a", 1]]), [
    {
      jsonrpc: "2.0",
      method: "sum",
      params: ["a", 1],
    },
  ]);
  assertEquals(
    createRequestBatch(["sum", { a: 1, b: 23 }, { c: 42 }], true),
    [
      {
        jsonrpc: "2.0",
        method: "sum",
        params: { a: 1, b: 23 },
      },
      {
        jsonrpc: "2.0",
        method: "sum",
        params: { c: 42 },
      },
    ],
  );
});

Deno.test("create request batch with object api", function (): void {
  assertEquals(
    createRequestBatch(
      { Joe: ["sum", ["a", 1]], Kelly: ["subtract", [42, 23]] },
      true,
    ),
    [
      {
        jsonrpc: "2.0",
        method: "sum",
        params: ["a", 1],
      },
      {
        jsonrpc: "2.0",
        method: "subtract",
        params: [42, 23],
      },
    ],
  );
  assertEquals(
    createRequestBatch({
      Joe: ["sum", ["a", 1]],
      Kelly: ["subtract", [42, 23]],
    }),
    [
      {
        jsonrpc: "2.0",
        method: "sum",
        params: ["a", 1],
        id: "Joe",
      },
      {
        jsonrpc: "2.0",
        method: "subtract",
        params: [42, 23],
        id: "Kelly",
      },
    ],
  );
});
