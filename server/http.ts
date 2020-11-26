import { cleanBatch, createResponseObject } from "./creation.ts";
import { validateRequest } from "./validation.ts";

import type { RespondOptions, ServerMethods } from "./response.ts";

export async function handleHttpRequest(
  message: string,
  methods: ServerMethods,
  options: RespondOptions,
): Promise<string | undefined> {
  const validationObject = validateRequest(message, methods);
  const responseObjectOrBatchOrNull = Array.isArray(validationObject)
    ? await cleanBatch(
      validationObject.map((rpc) =>
        createResponseObject({ validationObject: rpc, methods, options })
      ),
    )
    : await createResponseObject({
      validationObject,
      methods,
      options,
    });

  return responseObjectOrBatchOrNull === null
    ? undefined
    : JSON.stringify(responseObjectOrBatchOrNull);
}
