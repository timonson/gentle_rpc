import { createRemote } from "../../mod.ts";

const remote = await createRemote(new WebSocket("ws://0.0.0.0:8000")).catch(
  (err) => {
    console.log(err);
    throw err;
  },
);

const jwt = await remote.call("sendJwt", { user: "Bob" }) as string;
// eyJhbGciOiJIUzM4NCIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiYm9iIn0.C_jTAzMzjoGGDPIK5oKg4b8Yt8nbvAmbOyAbOk_17BsNu9za8e4KD41kxRvn3RUW

// Send messages between firstClient and secondClient:
const firstClient = await createRemote(new WebSocket("ws://0.0.0.0:8000", jwt));
const secondClient = await createRemote(new WebSocket("ws://0.0.0.0:8000"));

async function run(iter: AsyncGenerator<unknown>) {
  try {
    for await (let x of iter) {
      console.log(x);
    }
  } catch (err) {
    console.log(err, err.data);
  }
}

// const greeting = firstClient.subscribe("sayHello");
// const second = secondClient.subscribe("sayHello");
const loginFirst = firstClient.subscribe("login");
// const loginSecond = secondClient.subscribe("login");

// run(greeting.generator);
// run(second.generator);
run(loginFirst.generator);
// run(loginSecond.generator);
// greeting.emit(["first"]);
// second.emitBatch([["second"], ["third"]]);
loginFirst.emit();

// setTimeout(() => greeting.unsubscribe());
// setTimeout(() => second.unsubscribe());

setTimeout(() => firstClient.socket.close(), 2000);
setTimeout(() => secondClient.socket.close(), 2000);
