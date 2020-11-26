import {
  assertEquals,
  assertNotEquals,
  assertThrowsAsync,
} from "./test_deps.ts";

import { createRemote } from "../client/remote.ts";
import { BadServerDataError } from "../client/error.ts";

Deno.test("confirm client class instantiation", async function (): Promise<
  void
> {
  assertEquals(
    "batch" in createRemote("/"),
    true,
  );
  assertEquals(
    typeof createRemote("ws://example.com")
      .socket ===
      "function",
    true,
  );

  let r;
  try {
    r = typeof (await createRemote(
      new WebSocket("ws://example.com"),
    )).socket;
  } catch (err) {
    r = err;
  }
  assertEquals(
    r instanceof BadServerDataError,
    true,
  );
});
