import { createRemote } from "../../mod.ts";

const remote = createRemote("http://0.0.0.0:8000");

const greeting = await remote.call("sayHello", ["World"]);
// Hello World

const namedParams = await remote.call("callNamedParameters", {
  a: 5,
  b: 10,
  c: "result:",
});
// result: 50

const notification = await remote.call("sayHello", ["World"], {
  isNotification: true,
});
// undefined

const noise1 = await remote.batch([{
  animalsMakeNoise: [
    ["miaaow"],
    ["wuuuufu", "wuuuufu"],
    ["iaaaiaia", "iaaaiaia", "iaaaiaia"],
    ["fiiiiire"],
  ],
  sayHello: [["World"], undefined, ["World"]],
}]);
// [ "MIAAOW", "WUUUUFU WUUUUFU", "IAAAIAIA IAAAIAIA IAAAIAIA", "FIIIIIRE", "Hello World", "Hello ", "Hello World" ]

let batchNotification = await remote.batch([
  {
    animalsMakeNoise: [
      ["miaaow"],
      ["wuuuufu", "wuuuufu"],
      ["iaaaiaia", "iaaaiaia", "iaaaiaia"],
      ["fiiiiire"],
    ],
  },
], { isNotification: true });
// undefined

let noise2 = await remote.batch({
  cat: ["sayHello", ["miaaow"]],
  dog: ["animalsMakeNoise", ["wuuuufu"]],
  donkey: ["sayHello"],
  dragon: ["animalsMakeNoise", ["fiiiiire", "fiiiiire"]],
});
// { cat: "Hello miaaow", dog: "WUUUUFU", donkey: "Hello ", dragon: "FIIIIIRE FIIIIIRE" }

const jwt = await remote.call("sendJwt", { user: "Bob" }) as string;
// eyJhbGciOiJIUzM4NCIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiYm9iIn0.C_jTAzMzjoGGDPIK5oKg4b8Yt8nbvAmbOyAbOk_17BsNu9za8e4KD41kxRvn3RUW
const user = await remote.call("login", undefined, { jwt });
// Bob

console.log(greeting);
console.log(namedParams);
console.log(notification);
console.log(noise1);
console.log(batchNotification);
console.log(noise2);
console.log(jwt);
console.log(user);
