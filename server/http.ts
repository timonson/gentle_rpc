import { cleanBatch, createResponseObject } from "./creation.ts";
import { validateRequest } from "./validation.ts";
import { verifyJwt } from "./auth.ts";

import type { Methods, Options } from "./response.ts";
import type { ServerRequest } from "./deps.ts";
import type { ValidationObject } from "./validation.ts";

export async function handleHttpRequest(
  req: ServerRequest,
  methods: Methods,
  options: Required<Options>,
): Promise<string | undefined> {
  const message = new TextDecoder().decode(await Deno.readAll(req.body));
  const validationObjectOrBatch = validateRequest(message, methods);
  const responseObjectOrBatchOrNull = Array.isArray(validationObjectOrBatch)
    ? await cleanBatch(
      validationObjectOrBatch.map(async (rpc) =>
        createResponseObject(
          await verifyJwt({ validationObject: rpc, methods, options }),
        )
      ),
    )
    : await createResponseObject(
      await verifyJwt({
        validationObject: validationObjectOrBatch,
        methods,
        options,
      }),
    );
  return responseObjectOrBatchOrNull === null
    ? undefined
    : JSON.stringify(responseObjectOrBatchOrNull);
}
