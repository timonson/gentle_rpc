import { createRemote as createHttpRemote } from "./http_remote.ts";
import { createRemote as createWsRemote } from "./ws_remote.ts";

import type { HttpProxy, Resource } from "./http_remote.ts";
import type { WsProxy } from "./ws_remote.ts";

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
