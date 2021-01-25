import { createRemote } from "../../mod.ts";

const remote = await createRemote(new WebSocket("ws://0.0.0.0:8000"));

const noise = await remote.animalsMakeNoise(["wuufff"]);
console.log(noise);

remote.socket.close();
