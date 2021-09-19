import { verify } from "./deps.ts";

import type { Payload } from "./deps.ts";
import type { CreationInput } from "./creation.ts";

export async function verifyJwt(
  { validationObject, methods, options, authHeader }: CreationInput & {
    authHeader: string | null;
  },
): Promise<CreationInput & { jwtPayload?: Payload }> {
  if (validationObject.isError) return { validationObject, methods, options };
  if (
    options.auth.allMethods ||
    options.auth.methods?.includes(validationObject.method)
  ) {
    try {
      if (options.auth.key === undefined) {
        throw new Error("Authentication requires a CryptoKey.");
      }
      if (
        !authHeader ||
        !authHeader.startsWith("Bearer ") ||
        authHeader.length <= 7
      ) {
        throw new Error("No Authorization Header, no Bearer or no token.");
      } else {
        const jwtPayload = await verify(
          authHeader.slice(7),
          options.auth.key,
        );
        return { validationObject, methods, options, jwtPayload };
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
  } else {
    return { validationObject, methods, options };
  }
}
