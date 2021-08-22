import { verify } from "./deps.ts";

import type { CreationInput } from "./creation.ts";

export async function verifyJwt(
  { validationObject, methods, options }: CreationInput,
): Promise<CreationInput> {
  if (validationObject.isError) return { validationObject, methods, options };
  if (
    options.auth.allMethods ||
    options.auth.methods?.includes(validationObject.method)
  ) {
    try {
      if (options.auth.key === undefined) {
        throw new Error("No CryptoKey.");
      }
      if (
        !options.auth.authHeader ||
        !options.auth.authHeader.startsWith("Bearer ") ||
        options.auth.authHeader.length <= 7
      ) {
        throw new Error("No Authorization Header, no Bearer or no token.");
      } else {
        const payload = await verify(
          options.auth.authHeader.slice(7),
          options.auth.key,
        );
        options.additionalArguments.push({
          args: payload,
          methods: options.auth.methods,
          allMethods: options.auth.allMethods,
        });
      }
    } catch (err) {
      return {
        validationObject: {
          code: -32020,
          message: "Server error",
          id: validationObject.id,
          data: options.publicErrorStack ? err.stack : undefined,
          isError: true,
        },
        methods,
        options,
      };
    }
  }
  return { validationObject, methods, options };
}
