import { assertEquals, assertNotEquals, assertThrows } from "../test_deps.ts";
import { validateRequest } from "../../server/validation.ts";

const methods = {
  subtract: (a: number, b: number) => a - b,
};

Deno.test("validate request object", function (): void {
  assertEquals(
    validateRequest(
      JSON.stringify({
        jsonrpc: "2.0",
        method: "subtract",
        params: [42, 23],
        id: 1,
      }),
      methods,
    ),
    { id: 1, method: "subtract", params: [42, 23], isError: false },
  );

  assertEquals(
    validateRequest(
      JSON.stringify({
        jsonrpc: "2.0",
        method: "subtract",
        params: null,
        id: "abc",
      }),
      methods,
    ),
    {
      code: -32602,
      message: "Invalid params",
      id: "abc",
      isError: true,
    },
  );
});
