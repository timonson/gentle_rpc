import { createRemote } from "../../mod.ts";

const remote = createRemote("http://0.0.0.0:8000");

const greeting = await remote.sayHello(["World"]);
// Hello World

const namedParams = await remote.callNamedParameters({
  a: 5,
  b: 10,
  c: "result:",
});
// result: 50

const notification = await remote.sayHello.notify(["World"]);
// undefined

const noise1 = await remote.animalsMakeNoise.batch([
  ["miaaow"],
  ["wuuuufu", "wuuuufu"],
  ["iaaaiaia", "iaaaiaia", "iaaaiaia"],
  ["fiiiiire"],
]);
// [ "MIAAOW", "WUUUUFU WUUUUFU", "IAAAIAIA IAAAIAIA IAAAIAIA", "FIIIIIRE" ]

const noise2 = await remote.batch([
  "animalsMakeNoise",
  ["miaaow"],
  ["wuuuufu", "wuuuufu"],
  ["iaaaiaia", "iaaaiaia", "iaaaiaia"],
  ["fiiiiire"],
]);
// [ "MIAAOW", "WUUUUFU WUUUUFU", "IAAAIAIA IAAAIAIA IAAAIAIA", "FIIIIIRE" ]

const noise3 = await remote.batch({
  cat: ["sayHello", ["miaaow"]],
  dog: ["animalsMakeNoise", ["wuuuufu"]],
  donkey: ["sayHello"],
  dragon: ["animalsMakeNoise", ["fiiiiire", "fiiiiire"]],
});
// // { cat: "Hello miaaow", dog: "WUUUUFU", donkey: "Hello ", dragon: "FIIIIIRE FIIIIIRE" }

console.log(greeting); // Hello World
console.log(namedParams); // result: 50
console.log(notification); // undefined
console.log(noise1); // [ "MIAAOW", "WUUUUFU WUUUUFU", "IAAAIAIA IAAAIAIA IAAAIAIA", "FIIIIIRE" ]
console.log(noise2); // [ "MIAAOW", "WUUUUFU WUUUUFU", "IAAAIAIA IAAAIAIA IAAAIAIA", "FIIIIIRE" ]
console.log(noise3); // { cat: "Hello miaaow", dog: "WUUUUFU", donkey: "Hello ", dragon: "FIIIIIRE FIIIIIRE" }
