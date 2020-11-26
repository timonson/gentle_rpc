import { assertEquals, assertNotEquals, assertThrows } from "./test_deps.ts";

import { validateResponse } from "../client/validation.ts";
import { BadServerDataError } from "../client/error.ts";

const methods = {
  subtract: (a: number, b: number) => a - b,
};
Deno.test("validate response object", function (): void {
  assertEquals(
    validateResponse({ jsonrpc: "2.0", result: 19, id: 3 }),
    {
      id: 3,
      jsonrpc: "2.0",
      result: 19,
    },
  );
  assertEquals(
    validateResponse({ jsonrpc: "2.0", result: 19, id: null }),
    {
      id: null,
      jsonrpc: "2.0",
      result: 19,
    },
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
