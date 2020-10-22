import {
  assertEquals,
  assertNotEquals,
  assertThrows,
} from "https://deno.land/std/testing/asserts.ts";

import { validateRequest } from "../validate_request.ts";

const methods = {
  subtract: (a: number, b: number) => a - b,
};
Deno.test("validate request object", function (): void {
  assertEquals(
    validateRequest(
      {
        jsonrpc: "2.0",
        method: "subtract",
        params: [42, 23],
        id: 1,
      },
      methods,
    ),
    { id: 1, method: "subtract", params: [42, 23], isError: false },
  );

  assertEquals(
    validateRequest(
      {
        jsonrpc: "2.0",
        method: "subtract",
        params: null,
        id: "abc",
      },
      methods,
    ),
    {
      code: -32602,
      message: "Invalid parameters",
      id: "abc",
      isError: true,
    },
  );
});
