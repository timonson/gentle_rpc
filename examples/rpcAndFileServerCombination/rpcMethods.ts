export const rpcMethods = {
  sayHello: ([w]: [string]) => `Hello ${w}`,
  animalsMakeNoise: ([noise]: [string]) => noise.toUpperCase(),
  weCallThisMethod: (words: string[]) =>
    `Now comes a sentence with ${words.reduce((acc, s) => (acc += ` ${s}`))}`,
  callOrderedParameters: ([a, b]: [number, number]) =>
    `ordered parameters: ${a * b}`,
  callNamedParameters: ({ a, b, c }: { a: number; b: number; c: string }) =>
    `${c} ${a * b}`,
};
