import { cleanBatch, createResponseObject } from "./creation.ts";
import { validateRequest } from "./validation.ts";
import { verifyJwt } from "./auth.ts";

import type { Methods, Options } from "./response.ts";

export async function handleHttpRequest(
  req: Request,
  methods: Methods,
  options: Required<Options>,
  authHeader: string | null,
): Promise<Response> {
  const validationObjectOrBatch = validateRequest(await req.text(), methods);
  const responseObjectOrBatchOrNull = Array.isArray(validationObjectOrBatch)
    ? await cleanBatch(
      validationObjectOrBatch.map(async (rpc) =>
        createResponseObject(
          await verifyJwt({
            validationObject: rpc,
            methods,
            options,
            authHeader,
          }),
        )
      ),
    )
    : await createResponseObject(
      await verifyJwt({
        validationObject: validationObjectOrBatch,
        methods,
        options,
        authHeader,
      }),
    );
  const headers = new Headers(options.headers);
  if (options.cors) {
    headers.append("access-control-allow-origin", "*");
    headers.append(
      "access-control-allow-headers",
      "Content-Type, Authorization",
    );
  }
  if (responseObjectOrBatchOrNull === null) {
    return new Response(null, { status: 204, headers: headers });
  } else {
    headers.append("content-type", "application/json");
    return ("error" in responseObjectOrBatchOrNull &&
        responseObjectOrBatchOrNull.error.code === -32700)
      ? new Response(
        JSON.stringify(responseObjectOrBatchOrNull),
        {
          status: 400,
          headers,
        },
      )
      : new Response(
        JSON.stringify(responseObjectOrBatchOrNull),
        {
          status: 200,
          headers,
        },
      );
  }
}
