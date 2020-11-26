import { assertEquals, assertNotEquals, assertThrows } from "./test_deps.ts";

import { processBatchArray, processBatchObject } from "../client/http.ts";
import { BadServerDataError } from "../client/error.ts";

Deno.test("process batch request with array", function (): void {
  assertEquals(
    processBatchArray([
      {
        id: "random1",
        jsonrpc: "2.0",
        result: "a1",
      },
      {
        id: "random2",
        jsonrpc: "2.0",
        result: 19,
      },
    ]),
    ["a1", 19],
  );
  assertEquals(
    processBatchArray([
      {
        id: 111,
        jsonrpc: "2.0",
        result: "a1",
      },
      {
        id: "random2",
        jsonrpc: "2.0",
        result: 19,
      },
    ]),
    ["a1", 19],
  );
});

Deno.test("process batch request with object", function (): void {
  assertEquals(
    processBatchObject([
      {
        id: "Joe",
        jsonrpc: "2.0",
        result: "a1",
      },
      {
        id: 111,
        jsonrpc: "2.0",
        result: 19,
      },
    ]),
    { Joe: "a1", 111: 19 },
  );
  assertThrows((): void => {
    processBatchObject([
      {
        id: "Joe",
        jsonrpc: "2.0",
      },
      {
        id: 111,
        jsonrpc: "2.0",
        result: 19,
      },
    ]);
  }, BadServerDataError);
});
