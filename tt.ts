function isObject(obj: unknown): obj is object {
  return (
    obj !== null && typeof obj === "object" && Array.isArray(obj) === false
  );
}

function hasProperty<K extends string>(
  key: K,
  x: object
): x is { [key in K]: unknown } {
  return key in x;
}

const obj: unknown = { a: () => {}, b: 20, c: 30, d: { e: 40 } };

// if (isObject(obj) && hasProperty("b", obj)) obj.h = 11;

type O = { s: string };
let o: O = { s: "aa" };

console.log(JSON.stringify(obj));
