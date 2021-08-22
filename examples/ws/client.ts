import { createRemote } from "../../mod.ts";

const remote = await createRemote(new WebSocket("ws://0.0.0.0:8000"));

const noise = await remote.call("callNamedParameters", {
  a: 10,
  b: 20,
  c: "The result is:",
});
// The result is: 200
console.log(noise);

remote.socket.close();
