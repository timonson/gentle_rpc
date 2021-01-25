import { createRemote } from "../../mod.ts";

// Send messages between firstClient and secondClient (see file
// firstClient.ts).

const remote = await createRemote(new WebSocket("ws://0.0.0.0:8000"));

async function run(iter: AsyncGenerator<unknown>) {
  try {
    for await (let x of iter) {
      console.log(x);
    }
  } catch (err) {
    console.log(err.message, err.code, err.data);
  }
}

const greeting = remote.sayHello.subscribe();
run(greeting.generator);
greeting.emitBatch([["second"], ["third"]]);
// greeting.unsubscribe();

setTimeout(() => remote.socket.close(), 5000);
