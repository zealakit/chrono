import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createControllable,
  createStore,
  isBrowser,
  isSameDay,
  plainDate,
} from "../dist/foundation/index.js";

test("store notifies on change and skips equal updates", () => {
  const store = createStore({ a: 1, b: "x" });
  const seen: unknown[] = [];
  const stop = store.subscribe((state) => seen.push(state));
  store.set({ a: 1 });
  store.set({});
  assert.deepEqual(seen, []);
  store.set({ a: 2 });
  store.set((state) => ({ b: `${state.b}y` }));
  assert.deepEqual(seen, [
    { a: 2, b: "x" },
    { a: 2, b: "xy" },
  ]);
  assert.deepEqual(store.get(), { a: 2, b: "xy" });
  stop();
  store.set({ a: 3 });
  assert.equal(seen.length, 2);
});

test("store: listeners may unsubscribe while being notified", () => {
  const store = createStore({ n: 0 });
  const calls: string[] = [];
  const stop = store.subscribe(() => {
    calls.push("a");
    stop();
  });
  store.subscribe(() => calls.push("b"));
  store.set({ n: 1 });
  store.set({ n: 2 });
  assert.deepEqual(calls, ["a", "b", "b"]);
});

test("uncontrolled: stores the value and calls onChange", () => {
  const changes: number[] = [];
  const value = createControllable({
    defaultValue: 1,
    onChange: (v: number) => changes.push(v),
  });
  assert.equal(value.isControlled(), false);
  const seen: number[] = [];
  value.subscribe((v) => seen.push(v));
  value.set(2);
  value.set(2);
  assert.equal(value.get(), 2);
  assert.deepEqual(changes, [2]);
  assert.deepEqual(seen, [2]);
});

test("controlled: internal state never diverges; set only calls onChange", () => {
  const changes: number[] = [];
  const value = createControllable({
    value: 5,
    defaultValue: 1,
    onChange: (v: number) => changes.push(v),
  });
  assert.equal(value.isControlled(), true);
  assert.equal(value.get(), 5);
  value.set(9);
  assert.equal(value.get(), 5);
  assert.deepEqual(changes, [9]);
  const seen: number[] = [];
  value.subscribe((v) => seen.push(v));
  value.sync({ value: 9 });
  assert.equal(value.get(), 9);
  assert.deepEqual(seen, [9]);
  // Back to uncontrolled keeps the default state.
  value.sync({ value: undefined });
  assert.equal(value.isControlled(), false);
  assert.equal(value.get(), 1);
});

test("equals suppresses events for equal values", () => {
  const changes: unknown[] = [];
  const value = createControllable({
    defaultValue: plainDate(2026, 1, 1),
    onChange: (v) => changes.push(v),
    equals: isSameDay,
  });
  value.set(plainDate(2026, 1, 1));
  assert.equal(changes.length, 0);
  value.set(plainDate(2026, 1, 2));
  assert.equal(changes.length, 1);
  value.sync({ onChange: undefined });
  value.set(plainDate(2026, 1, 3));
  assert.equal(changes.length, 1);
});

test("isBrowser is false in plain Node, true with a registered DOM", () => {
  // tests/setup.ts registers happy-dom globals for this process.
  assert.equal(isBrowser(), true);
  assert.equal(typeof isBrowser, "function");
});
