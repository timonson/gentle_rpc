import { createRemote } from "../../mod.ts";

const remote = await createRemote(new WebSocket("ws://0.0.0.0:8000"));

const noise = await remote.animalsMakeNoise(["wuufff"]).then(console.log).catch(
  console.log,
);

remote.socket.close();
