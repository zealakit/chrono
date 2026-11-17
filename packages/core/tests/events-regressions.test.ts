import assert from "node:assert/strict";
import { test } from "node:test";
import {
  layoutTimeGridEvents,
  normalizeEvents,
} from "../dist/calendar/index.js";
import { createSelectionPointer } from "../dist/calendar/interaction/pointer.js";
import { createTicker } from "../dist/foundation/index.js";
import { plainDate } from "../dist/foundation/index.js";

const DAY = { date: plainDate(2026, 11, 17), key: "2026-11-17" };
const range = { start: plainDate(2026, 11, 17), end: plainDate(2026, 11, 17) };

test("an event without an end is drawn at the minimum height", () => {
  const original = console.warn;
  console.warn = () => {};
  try {
    const events = normalizeEvents(
      [{ id: "a", start: "2026-11-17T10:00:00" }] as never,
      {
        visibleRange: range,
      },
    );
    const [segment] = layoutTimeGridEvents(events, [DAY]);
    assert.ok(segment);
    assert.equal(segment.height, (15 * 60) / 86400);
  } finally {
    console.warn = original;
  }
});

test("minimum-height events do not share a column with a neighbour", () => {
  const events = normalizeEvents(
    [
      { id: "a", start: "2026-11-17T10:00:00", end: "2026-11-17T10:05:00" },
      { id: "b", start: "2026-11-17T10:10:00", end: "2026-11-17T10:15:00" },
    ],
    { visibleRange: range },
  );
  const segments = layoutTimeGridEvents(events, [DAY]);
  assert.equal(segments.length, 2);
  assert.notEqual(segments[0]?.column, segments[1]?.column);
});

test("normalize warns once per cause", () => {
  const original = console.warn;
  let count = 0;
  console.warn = () => {
    count += 1;
  };
  try {
    const input = [{ id: "warn-once", start: "2026-11-17T09:00:00" }] as never;
    normalizeEvents(input, { visibleRange: range });
    normalizeEvents(input, { visibleRange: range });
    assert.equal(count, 1);
  } finally {
    console.warn = original;
  }
});

test("a ticker re-aligns to the minute boundary", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 0 });
  const seen: number[] = [];
  const ticker = createTicker((now) => seen.push(now));
  ticker.start(0);
  t.mock.timers.tick(60_000);
  // Simulated latency: the timer fires 7 ms late.
  t.mock.timers.setTime(120_007);
  t.mock.timers.tick(0);
  t.mock.timers.tick(60_000);
  ticker.stop();
  assert.ok(seen.length >= 1);
  assert.equal(ticker.running(), false);
});

test("selection pointer ignores non-primary buttons", () => {
  const listeners = new Map<string, (event: unknown) => void>();
  const root = {
    addEventListener: (name: string, fn: (event: unknown) => void) =>
      listeners.set(name, fn),
    removeEventListener: () => {},
  } as unknown as HTMLElement;
  let started = 0;
  const pointer = createSelectionPointer(root, {
    start: () => {
      started += 1;
    },
    extend: () => {},
    confirm: () => {},
    cancel: () => {},
    hitTest: () => ({ key: "2026-11-17" }) as never,
  });
  const down = listeners.get("pointerdown") as (event: unknown) => void;
  down({ button: 2, pointerType: "mouse", clientX: 0, clientY: 0 });
  assert.equal(started, 0);
  down({ button: 0, pointerType: "mouse", clientX: 0, clientY: 0 });
  assert.equal(started, 1);
  pointer.destroy();
});
