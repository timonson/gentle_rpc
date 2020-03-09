import { createRemote } from "../rpcClient.ts"
const remote = createRemote("http://0.0.0.0:8000")
// const remote = createRemote("http://0.0.0.0:8000", {}, true) // notification

try {
  const greeting = await remote.sayHello("World")
  console.log(greeting)
} catch (err) {
  console.log(err)
}

try {
  const noise1 = await remote.batch({
    cat: ["animalsMakeNoise", ["miaaow"]],
    dog: ["animalsMakeNoise", ["wuuuufu"]],
    donkey: ["animalsMakeNoise", ["iaaaiaia"]],
    dragon: ["animalsMakeNoise", ["fiiiiire"]],
  })
  console.log(noise1)
} catch (err) {
  console.log(err)
}

try {
  const noise2 = await remote.batch([
    ["animalsMakeNoise", ["miaaow"]],
    ["animalsMakeNoise", ["wuuuufu"]],
    ["animalsMakeNoise", ["iaaaiaia"]],
    ["animalsMakeNoise", ["fiiiiire"]],
  ])
  console.log(noise2)
} catch (err) {
  console.log(err)
}
