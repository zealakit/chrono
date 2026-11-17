import assert from "node:assert/strict";
import { test } from "node:test";

type GlobalStateModule =
  typeof import("../dist/foundation/store/global-state.js");
const moduleUrl = new URL(
  "../dist/foundation/store/global-state.js",
  import.meta.url,
).href;
const loadCopy = (id: string): Promise<GlobalStateModule> =>
  import(`${moduleUrl}?copy=${id}`);

test("two module copies share state through the Symbol.for key", async () => {
  const a = await loadCopy("a");
  const b = await loadCopy("b");
  assert.notEqual(a.getGlobalState, b.getGlobalState);
  const name = `test-${Math.random()}`;
  const first = a.getGlobalState(name, () => ({ count: 1 }));
  const second = b.getGlobalState(name, () => ({ count: 99 }));
  assert.equal(first, second);
  first.count += 1;
  assert.equal(second.count, 2);
  const key = Symbol.for(`@zealakit/chrono-core/v1/${name}`);
  assert.equal((globalThis as unknown as Record<symbol, unknown>)[key], first);
});

test("state is created lazily and only once", async () => {
  const { getGlobalState } = await import(
    "../dist/foundation/store/global-state.js"
  );
  let creates = 0;
  const name = `lazy-${Math.random()}`;
  assert.equal(creates, 0);
  getGlobalState(name, () => ++creates);
  getGlobalState(name, () => ++creates);
  assert.equal(creates, 1);
});
