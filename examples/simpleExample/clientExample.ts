import { createRemote } from "../../request.ts";

// notification:
// const remote = createRemote("http://0.0.0.0:8000", { isNotification: true });
const remote = createRemote("http://0.0.0.0:8000");

const greeting1 = await remote
  .sayHello(["World"])
  .catch((err) => console.log(err.code));
const greeting2 = await remote.sayHello();
const subtraction = await remote.subtract([2, 21, 3]);
const orderedParams = await remote.callOrderedParameters([
  "a",
  "lot",
  "of",
  "words.",
]);
const namedParams = await remote.callNamedParameters({
  a: 5,
  b: 10,
  c: "result:",
});

const noise1 = await remote.batch([
  "animalsMakeNoise",
  ["miaaow"],
  ["wuuuufu", "wuuuufu"],
  ["iaaaiaia", "iaaaiaia", "iaaaiaia"],
  ["fiiiiire"],
]);

const noise2 = await remote.batch({
  cat: ["sayHello", ["miaaow"]],
  dog: ["animalsMakeNoise", ["wuuuufu"]],
  donkey: ["sayHello"],
  dragon: ["animalsMakeNoise", ["fiiiiire", "fiiiiire"]],
});

console.log(greeting1); // Hello World
console.log(greeting2); // Hello
console.log(subtraction); // -19
console.log(orderedParams); // Now comes a sentence with a lot of words.
console.log(namedParams); // result: 50
console.log(noise1); // [ "MIAAOW", "WUUUUFU WUUUUFU", "IAAAIAIA IAAAIAIA IAAAIAIA", "FIIIIIRE" ]
console.log(noise2); // { cat: "Hello miaaow", dog: "WUUUUFU", donkey: "Hello ", dragon: "FIIIIIRE FIIIIIRE" }
