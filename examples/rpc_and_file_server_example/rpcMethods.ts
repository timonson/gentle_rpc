export const rpcMethods = {
  sayHello: (w?: [string]) => `Hello ${w ? w[0] : ""}`,
  subtract: (input: number[]) => input[0] - input[1],
  callOrderedParameters: (words: string[]) =>
    `Now comes a sentence with ${words.reduce((acc, s) => (acc += ` ${s}`))}`,
  callNamedParameters: ({ a, b, c }: { a: number; b: number; c: string }) =>
    `${c} ${a * b}`,
  animalsMakeNoise: (noise: [string]) =>
    noise.map((el) => el.toUpperCase()).join(" "),
  addServerArg: ([name, additionalArg]: [string, { query: string }]) =>
    `${additionalArg.query} ${name}`,
};