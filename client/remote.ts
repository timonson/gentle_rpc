import { createRemote as createHttpRemote } from "./http.ts";
import { createRemote as createWsRemote } from "./ws.ts";

import type { HttpProxy, Resource } from "./http.ts";
import type { WsProxy } from "./ws.ts";

export function createRemote(
  resource: Resource,
  options?: RequestInit,
): HttpProxy;
export function createRemote(
  socket: WebSocket,
): Promise<WsProxy>;
export function createRemote(
  resourceOrSocket: Resource | WebSocket,
  options?: RequestInit,
) {
  return resourceOrSocket instanceof WebSocket
    ? createWsRemote(resourceOrSocket)
    : createHttpRemote(resourceOrSocket, options);
}
