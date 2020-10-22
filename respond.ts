import {
  createResponseBatch,
  createRpcResponseObject,
} from "./create_response.ts";

import type { JsonValue } from "./json_rpc_types.ts";
import type { ServerRequest } from "https://deno.land/std/http/server.ts";

export type ServerMethods = {
  [method: string]: (...arg: any) => JsonValue;
};

function tryToParse(json: string) {
  try {
    return [JSON.parse(json), null];
  } catch {
    return [
      null,
      {
        jsonrpc: "2.0",
        error: { code: -32700, message: "Parse error" },
        id: null,
      },
    ];
  }
}

export async function respond(
  req: ServerRequest,
  methods: ServerMethods,
  { additionalArgument }: { additionalArgument?: Record<string, any> } = {},
) {
  const [parsedBody, parseError] = tryToParse(
    new TextDecoder().decode(await Deno.readAll(req.body)),
  );

  const jsonRpcResponseOrBatchOrNull = parseError
    ? parseError
    : Array.isArray(parsedBody) && parsedBody.length > 0
    ? await createResponseBatch(parsedBody, methods, additionalArgument)
    : await createRpcResponseObject(parsedBody, methods, additionalArgument);

  const headers = new Headers();
  headers.set("content-type", "application/json");

  const response = jsonRpcResponseOrBatchOrNull === null
    ? undefined
    : JSON.stringify(jsonRpcResponseOrBatchOrNull);

  req.respond(
    response === undefined ? { status: 204 } : {
      body: new TextEncoder().encode(response),
      headers,
      status: 200,
    },
  );

  return response;
}
