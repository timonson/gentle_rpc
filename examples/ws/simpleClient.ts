import { createRemote } from "../../mod.ts";

const remote = await createRemote(new WebSocket("ws://0.0.0.0:8000"));
const remote2 = await createRemote(new WebSocket("ws://0.0.0.0:8000"));

const noise2 = await remote.animalsMakeNoise(["wuufff"]).then(console.log)
  .catch(
    console.log,
  );
const noise = await remote.animalsMakeNoise(["wuufff"]).then(console.log).catch(
  console.log,
);

remote.socket.close();
