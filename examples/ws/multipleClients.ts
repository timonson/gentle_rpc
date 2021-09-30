import { createRemote } from "../../mod.ts";

const remote = await createRemote(new WebSocket("ws://0.0.0.0:8000")).catch(
  (err) => {
    console.log(err);
    throw err;
  },
);
const jwt = await remote.call("sendJwt", { user: "Bob" }) as string;
// eyJhbGciOiJIUzM4NCIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiYm9iIn0.C_jTAzMzjoGGDPIK5oKg4b8Yt8nbvAmbOyAbOk_17BsNu9za8e4KD41kxRvn3RUW
remote.socket.close();

// Send messages between firstClient and secondClient:
const firstClient = await createRemote(new WebSocket("ws://0.0.0.0:8000", jwt));
const secondClient = await createRemote(
  new WebSocket("ws://0.0.0.0:8000", jwt),
);

async function run(iter: AsyncGenerator<unknown>) {
  try {
    for await (let x of iter) {
      console.log(x);
    }
  } catch (err) {
    console.log(err, err.data);
  }
}

const greetingFirst = firstClient.subscribe("sayHello");
const greetingSecond = secondClient.subscribe("sayHello");
const loginFirst = firstClient.subscribe("login");
const loginSecond = secondClient.subscribe("login");

run(greetingFirst.generator);
run(greetingSecond.generator);
run(loginFirst.generator);
run(loginSecond.generator);

greetingFirst.emit(["first"]);
greetingSecond.emit(["second"]);
loginFirst.emit();

setTimeout(() => greetingFirst.unsubscribe());
setTimeout(() => greetingSecond.unsubscribe());
setTimeout(() => loginFirst.unsubscribe());
setTimeout(() => loginSecond.unsubscribe());

setTimeout(() => firstClient.socket.close(), 2000);
setTimeout(() => secondClient.socket.close(), 2000);
