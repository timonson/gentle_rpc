import { Remote as HttpRemote } from "./http.ts";
import { Remote as WsRemote } from "./ws.ts";

import type { Resource } from "./http.ts";

function listen(socket: WebSocket): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    socket.onopen = () => resolve(socket);
    socket.onerror = (err) => reject(err);
  });
}

export function createRemote(
  resource: Resource,
  options?: RequestInit,
): HttpRemote;
export function createRemote(
  socket: WebSocket,
): Promise<WsRemote>;
export function createRemote(
  resourceOrSocket: Resource | WebSocket,
  options?: RequestInit,
) {
  return resourceOrSocket instanceof WebSocket
    ? listen(resourceOrSocket).then((socket) => new WsRemote(socket))
    : new HttpRemote(resourceOrSocket, options);
}
