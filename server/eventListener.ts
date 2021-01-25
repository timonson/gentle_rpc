const lstnr = (e: CustomEvent) => {
  console.log("hello");
  console.log(e.detail);
};
// addEventListener("test", lstnr);
// addEventListener("test", lstnr);

// dispatchEvent(new Event("test"));

function createEvent(
  eventName: string,
  {
    bubbles = true,
    composed = true,
    detail = null,
  }: { bubbles?: boolean; composed?: boolean; detail?: unknown } = {},
) {
  return new CustomEvent(eventName, {
    bubbles,
    composed,
    detail,
  });
}

const e = createEvent("my", { detail: "some" });

function nameFunction(name: any, body: any) {
  return {
    [name](...args: any) {
      return body(...args);
    },
  }[name];
}
const f = () => console.log("aaaaaaaaaaaaa");
const g = () => console.log("aaaaaaaaaaaaa");
addEventListener("my", f as any);
addEventListener("my", g as any);

const listenersStore: Map<string, any> = new Map();
listenersStore.set("a", f);
listenersStore.set("b", g);

dispatchEvent(e);
dispatchEvent(e);
removeEventListener("my", listenersStore.get("a"));
dispatchEvent(e);
