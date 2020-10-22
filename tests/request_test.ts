import {
  assertEquals,
  assertNotEquals,
  assertThrows,
} from "https://deno.land/std/testing/asserts.ts";

import {
  createRemote,
  processBatchArray,
  processBatchObject,
} from "../request.ts";
import { BadServerDataError } from "../validate_response.ts";

Deno.test("confirm client class instantiation", function (): void {
  assertEquals(
    createRemote("/", { isNotification: true }).isNotification,
    true,
  );
});

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
