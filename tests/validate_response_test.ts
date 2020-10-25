import { assertEquals, assertNotEquals, assertThrows } from "./deps.ts";

import { BadServerDataError, validateResponse } from "../validate_response.ts";

const methods = {
  subtract: (a: number, b: number) => a - b,
};
Deno.test("validate response object", function (): void {
  assertEquals(
    validateResponse({ jsonrpc: "2.0", result: 19, id: 3 }),
    19,
  );
  assertEquals(
    validateResponse({ jsonrpc: "2.0", result: 19, id: null }),
    19,
  );
  assertThrows((): void => {
    validateResponse({ jsonrpc: ".0", result: 19, id: 3 });
  }, BadServerDataError);
  assertThrows((): void => {
    validateResponse({ jsonrpc: "2.0", id: 3 });
  }, BadServerDataError);
  assertThrows((): void => {
    validateResponse({
      jsonrpc: "2.0",
      result: 19,
      id: undefined as any,
    });
  }, BadServerDataError);
  assertThrows(
    (): void => {
      validateResponse({
        jsonrpc: "2.0",
        error: { code: 2222 },
        id: null,
      });
    },
    BadServerDataError,
    "Received data is no RPC response object.",
  );
  assertThrows((): void => {
    validateResponse({
      jsonrpc: "2.0",
      error: { code: 2222, message: "some text" },
      id: null,
    });
  }, BadServerDataError);
});
