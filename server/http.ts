import { createRpcResponseOrBatch } from "./creation.ts";
import { validateRequest } from "./validation.ts";

import type { Methods, Options } from "./response.ts";

export async function handleHttpRequest(
  req: Request,
  methods: Methods,
  options: Required<Options>,
  authHeader: string | null,
): Promise<Response> {
  const validationObjectOrBatch = validateRequest(await req.text(), methods);
  const rpcResponseOrBatchOrNull = await createRpcResponseOrBatch(
    validationObjectOrBatch,
    methods,
    options,
    authHeader,
  );
  const headers = new Headers(options.headers);
  if (options.cors) {
    headers.append("access-control-allow-origin", "*");
  }
  if (rpcResponseOrBatchOrNull === null) {
    return new Response(null, { status: 204, headers: headers });
  } else {
    headers.append("content-type", "application/json");
    return ("error" in rpcResponseOrBatchOrNull &&
        rpcResponseOrBatchOrNull.error.code === -32700)
      ? new Response(
        JSON.stringify(rpcResponseOrBatchOrNull),
        {
          status: 400,
          headers,
        },
      )
      : new Response(
        JSON.stringify(rpcResponseOrBatchOrNull),
        {
          status: 200,
          headers,
        },
      );
  }
}
