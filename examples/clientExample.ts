import { createRemote } from "../rpcClient.ts";
const remote = createRemote("http://0.0.0.0:8000");
// const remote = createRemote("http://0.0.0.0:8000", { isNotification: true }) // notification

const greeting = await remote.sayHello("World");

const noise1 = await remote.batch([
  ["animalsMakeNoise", ["miaaow"]],
  ["animalsMakeNoise", ["wuuuufu"]],
  ["animalsMakeNoise", ["iaaaiaia"]],
  ["animalsMakeNoise", ["fiiiiire"]],
]);

let noise2 = await remote.batch({
  cat: ["animalsMakeNoise", ["miaaow"]],
  dog: ["animalsMakeNoise", ["wuuuufu"]],
  donkey: ["animalsMakeNoise", ["iaaaiaia"]],
  dragon: ["animalsMakeNoise", ["fiiiiire"]],
});

const sentence = await remote.weCallThisMethod(
  "a",
  "lot",
  "of",
  "cool",
  "words",
);

let noise3 = await remote.batch([
  ["animalsMakeNoise", ["miaaow"]],
  ["animalsMakeNoise", ["wuuuufu"]],
  ["animalsMakeNoise", ["iaaaiaia"]],
  ["animalsMakeNoise", ["fiiiiire"]],
]);

// noise3 = 8;
// noise2 = 444;

console.log(greeting);
console.log(noise1);
console.log(noise2);
console.log(sentence);
