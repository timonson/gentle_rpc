import { createRemote } from "../../mod.ts";

const remote = await createRemote(new WebSocket("ws://0.0.0.0:8000"));

async function run(iter: AsyncGenerator<unknown>) {
  try {
    for await (let x of iter) {
      console.log(x);
    }
  } catch (err) {
    console.log(err.message, err.code);
  }
}

const greeting = remote.sayHello.subscribe();
run(greeting.generator);
greeting.emit(["other clients"]);
greeting.emitBatch([["other clients"], ["other clients"]]);
greeting.unsubscribe();

setTimeout(() => remote.socket.close(), 100);
