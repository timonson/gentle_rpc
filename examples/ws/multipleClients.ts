import { createRemote } from "../../mod.ts";

// Send messages between firstClient and secondClient (see file
// secondClient.ts).

const firstClient = await createRemote(new WebSocket("ws://0.0.0.0:8000"));
const secondClient = await createRemote(new WebSocket("ws://0.0.0.0:8000"));

async function run(iter: AsyncGenerator<unknown>) {
  try {
    for await (let x of iter) {
      console.log(x);
    }
  } catch (err) {
    console.log(err.message, err.code, err.data);
  }
}

const greeting = firstClient.subscribe("sayHello");
const second = secondClient.subscribe("sayHello");

run(greeting.generator);
run(second.generator);
greeting.emit({ w: "first" });
second.emitBatch([{ w: "second" }, { w: "third" }]);

setTimeout(() => greeting.unsubscribe());
setTimeout(() => second.unsubscribe());

setTimeout(() => firstClient.socket.close(), 2000);
setTimeout(() => secondClient.socket.close(), 2000);
