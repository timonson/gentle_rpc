import { createRemote, WsProxy, wsProxyHandler } from "../../mod.ts";

const firstClient = new Proxy<WsProxy>(
  await createRemote(new WebSocket("ws://0.0.0.0:8000")),
  wsProxyHandler,
);
const secondClient = new Proxy<WsProxy>(
  await createRemote(new WebSocket("ws://0.0.0.0:8000")),
  wsProxyHandler,
);

const noise = await firstClient.callNamedParameters({
  a: 10,
  b: 20,
  c: "The result is:",
});
// The result is: 200
console.log(noise);

// Send messages between firstClient and secondClient:

async function run(iter: AsyncGenerator<unknown>) {
  try {
    for await (let x of iter) {
      console.log(x);
    }
  } catch (err) {
    console.log(err.message, err.code, err.data);
  }
}

const firstClientGreeting = firstClient.sayHello.subscribe();
const secondClientGreeting = secondClient.sayHello.subscribe();

run(firstClientGreeting.generator);
run(secondClientGreeting.generator);
firstClientGreeting.emit(["first"]);
secondClientGreeting.emit(["second"]);

setTimeout(() => firstClientGreeting.unsubscribe());
setTimeout(() => secondClientGreeting.unsubscribe());

setTimeout(() => firstClient.socket.close(), 5000);
setTimeout(() => secondClient.socket.close(), 5000);
