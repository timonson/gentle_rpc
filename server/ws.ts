import { cleanBatch, createResponseObject } from "./creation.ts";
import { validateRequest } from "./validation.ts";
import {
  makeInternalMethodsOptionsMaybe,
  subscriptionMap,
} from "./ws_internal_methods.ts";
import { isWebSocketCloseEvent, isWebSocketPingEvent } from "../deps.ts";

import type { Input } from "./ws_internal_methods.ts";

export async function handleWs(
  { socket, methods, options }: Omit<Input, "validationObject">,
) {
  console.log("socket connected!");
  try {
    for await (const ev of socket) {
      if (typeof ev === "string") {
        // console.log("ws:Text", ev);
        const validationObjectOrBatch = validateRequest(ev, methods);
        const responseObjectOrBatchOrNull =
          Array.isArray(validationObjectOrBatch)
            ? await cleanBatch(
              validationObjectOrBatch.map(async (validationObject) =>
                await createResponseObject(
                  makeInternalMethodsOptionsMaybe(
                    { socket, validationObject, methods, options },
                  ),
                )
              ),
            )
            : await createResponseObject(
              makeInternalMethodsOptionsMaybe(
                {
                  socket,
                  validationObject: validationObjectOrBatch,
                  methods,
                  options,
                },
              ),
            );
        if (responseObjectOrBatchOrNull) {
          await socket.send(JSON.stringify(responseObjectOrBatchOrNull));
        }
      } else if (isWebSocketPingEvent(ev)) {
        const [, body] = ev;
        console.log("ws:Ping", body);
      } else if (isWebSocketCloseEvent(ev)) {
        const { code, reason } = ev;
        console.log("ws:Close", code, reason);
        subscriptionMap.delete(socket);
      }
    }
  } catch (err) {
    console.error(`failed to receive frame: ${err}`);
    subscriptionMap.delete(socket);
    if (!socket.isClosed) {
      await socket.close(1000).catch((err) => console.error(err));
    }
  }
}
