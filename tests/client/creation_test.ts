import {
  assertEquals,
  assertNotEquals,
  assertThrowsAsync,
} from "../test_deps.ts";

import { createRequest, createRequestBatch } from "../../client/creation.ts";

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
  assertEquals(
    createRequestBatch(
      [{
        animalsMakeNoise: [
          ["miaaow"],
          ["wuuuufu", "wuuuufu"],
          ["iaaaiaia", "iaaaiaia", "iaaaiaia"],
          ["fiiiiire"],
        ],
        sayHello: [["World"], undefined, ["World"]],
        namedParams: [{
          a: 5,
          b: 10,
          c: "result:",
        }, {
          a: 5,
          b: null,
          c: "result:",
        }],
      }],
      true,
    ),
    [
      {
        jsonrpc: "2.0",
        method: "animalsMakeNoise",
        params: ["miaaow"],
      },
      {
        jsonrpc: "2.0",
        method: "animalsMakeNoise",
        params: ["wuuuufu", "wuuuufu"],
      },
      {
        jsonrpc: "2.0",
        method: "animalsMakeNoise",
        params: ["iaaaiaia", "iaaaiaia", "iaaaiaia"],
      },
      {
        jsonrpc: "2.0",
        method: "animalsMakeNoise",
        params: ["fiiiiire"],
      },
      {
        jsonrpc: "2.0",
        method: "sayHello",
        params: ["World"],
      },
      { jsonrpc: "2.0", method: "sayHello" },
      {
        jsonrpc: "2.0",
        method: "sayHello",
        params: ["World"],
      },
      {
        jsonrpc: "2.0",
        method: "namedParams",
        params: { a: 5, b: 10, c: "result:" },
      },
      {
        jsonrpc: "2.0",
        method: "namedParams",
        params: { a: 5, b: null, c: "result:" },
      },
    ],
  );

  assertEquals(
    createRequestBatch(
      {
        cat: ["sayHello", ["miaaow"]],
        dog: ["animalsMakeNoise", ["wuuuufu"]],
        donkey: ["sayHello"],
        dragon: ["animalsMakeNoise", ["fiiiiire", "fiiiiire"]],
        tiger: ["namedParams", {
          a: 5,
          b: 10,
          c: "result:",
        }],
      },
      true,
    ),
    [
      { jsonrpc: "2.0", method: "sayHello", params: ["miaaow"] },
      { jsonrpc: "2.0", method: "animalsMakeNoise", params: ["wuuuufu"] },
      { jsonrpc: "2.0", method: "sayHello" },
      {
        jsonrpc: "2.0",
        method: "animalsMakeNoise",
        params: ["fiiiiire", "fiiiiire"],
      },
      {
        jsonrpc: "2.0",
        method: "namedParams",
        params: { a: 5, b: 10, c: "result:" },
      },
    ],
  );
});
