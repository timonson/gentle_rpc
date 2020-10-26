import {
  createResponseBatch,
  createRpcResponseObject,
} from "./create_response.ts";

import type { JsonValue } from "./json_rpc_types.ts";
import type { ServerRequest } from "https://deno.land/std@0.74.0/http/server.ts";

export type ServerMethods = {
  [method: string]: (...arg: any) => JsonValue;
};
export type RespondOptions = {
  argument?: any;
  methods?: (keyof ServerMethods)[];
  allMethods?: true;
  publicErrorStack?: true;
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
  options: RespondOptions = {},
) {
  const [parsedBody, parseError] = tryToParse(
    new TextDecoder().decode(await Deno.readAll(req.body)),
  );

  const jsonRpcResponseOrBatchOrNull = parseError
    ? parseError
    : Array.isArray(parsedBody) && parsedBody.length > 0
    ? await createResponseBatch(parsedBody, methods, options)
    : await createRpcResponseObject(parsedBody, methods, options);

  const response = jsonRpcResponseOrBatchOrNull === null
    ? undefined
    : JSON.stringify(jsonRpcResponseOrBatchOrNull);

  req.respond(
    response === undefined ? { status: 204 } : {
      body: new TextEncoder().encode(response),
      headers: new Headers([["content-type", "application/json"]]),
      status: 200,
    },
  );

  return response;
}
