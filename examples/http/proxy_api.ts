import { createRemote, HttpProxy, httpProxyHandler } from "../../mod.ts";

const remote = new Proxy<HttpProxy>(
  createRemote("http://0.0.0.0:8000"),
  httpProxyHandler,
);

let greeting = await remote.sayHello(["World"]);
// Hello World

const namedParams = await remote.callNamedParameters({
  a: 5,
  b: 10,
  c: "result:",
});
// result: 50

let notification = await remote.sayHello.notify(["World"]);
// undefined

const noise1 = await remote.animalsMakeNoise.batch([
  ["miaaow"],
  ["wuuuufu", "wuuuufu"],
  ["iaaaiaia", "iaaaiaia", "iaaaiaia"],
  ["fiiiiire"],
]);
// [ "MIAAOW", "WUUUUFU WUUUUFU", "IAAAIAIA IAAAIAIA IAAAIAIA", "FIIIIIRE" ]

const jwt = await remote.sendJwt({ user: "bob" });
const user = await remote.login.auth(jwt as string)();

console.log(greeting);
console.log(namedParams);
console.log(notification);
console.log(noise1);
console.log(jwt);
console.log(user);
