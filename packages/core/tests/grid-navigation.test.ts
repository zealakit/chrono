import assert from "node:assert/strict";
import { test } from "node:test";
import {
  nextFocusedDate,
  plainDate,
  type GridNavContext,
  type GridNavKey,
} from "../dist/foundation/index.js";

const d = (y: number, m: number, day: number) => plainDate(y, m, day);
const ymd = (x: { year: number; month: number; day: number }) =>
  `${x.year}-${x.month}-${x.day}`;
const day: GridNavContext = { weekStartsOn: 1, direction: "ltr", level: "day" };
const press = (
  from: ReturnType<typeof d>,
  key: GridNavKey,
  ctx: GridNavContext,
  shift = false,
) => ymd(nextFocusedDate(from, key, { shift }, ctx));

test("day level keys", () => {
  const from = d(2026, 11, 18); // Wednesday
  assert.equal(press(from, "ArrowLeft", day), "2026-11-17");
  assert.equal(press(from, "ArrowRight", day), "2026-11-19");
  assert.equal(press(from, "ArrowUp", day), "2026-11-11");
  assert.equal(press(from, "ArrowDown", day), "2026-11-25");
  assert.equal(press(from, "Home", day), "2026-11-16");
  assert.equal(press(from, "End", day), "2026-11-22");
  assert.equal(press(from, "Home", { ...day, weekStartsOn: 7 }), "2026-11-15");
  assert.equal(press(from, "End", { ...day, weekStartsOn: 7 }), "2026-11-21");
  assert.equal(press(from, "PageUp", day), "2026-10-18");
  assert.equal(press(from, "PageDown", day), "2026-12-18");
  assert.equal(press(from, "PageUp", day, true), "2025-11-18");
  assert.equal(press(from, "PageDown", day, true), "2027-11-18");
  assert.equal(press(d(2026, 1, 31), "PageDown", day), "2026-2-28"); // clamped (D5)
  assert.equal(press(d(2024, 2, 29), "PageDown", day, true), "2025-2-28");
  assert.equal(press(d(2026, 12, 31), "ArrowRight", day), "2027-1-1");
});

test("rtl swaps left and right only", () => {
  const rtl = { ...day, direction: "rtl" } as const;
  const from = d(2026, 11, 18);
  assert.equal(press(from, "ArrowLeft", rtl), "2026-11-19");
  assert.equal(press(from, "ArrowRight", rtl), "2026-11-17");
  assert.equal(press(from, "ArrowUp", rtl), "2026-11-11");
  assert.equal(press(from, "Home", rtl), "2026-11-16");
});

test("results clamp to min and max; disabled dates are not skipped", () => {
  const bounded = { ...day, min: d(2026, 11, 10), max: d(2026, 11, 20) };
  assert.equal(press(d(2026, 11, 11), "ArrowLeft", bounded), "2026-11-10");
  assert.equal(press(d(2026, 11, 10), "ArrowLeft", bounded), "2026-11-10");
  assert.equal(press(d(2026, 11, 19), "ArrowDown", bounded), "2026-11-20");
  assert.equal(press(d(2026, 11, 15), "PageDown", bounded), "2026-11-20");
  assert.equal(press(d(2026, 11, 15), "PageUp", bounded, true), "2026-11-10");
  assert.equal(press(d(2026, 11, 15), "Home", bounded), "2026-11-10");
  // No predicate exists in the context: a disabled day is simply the next day.
  assert.equal(press(d(2026, 11, 14), "ArrowRight", bounded), "2026-11-15");
});

test("year range edges do not throw", () => {
  assert.equal(press(d(1, 1, 1), "ArrowLeft", day), "1-1-1");
  assert.equal(press(d(9999, 12, 31), "ArrowRight", day), "9999-12-31");
  assert.equal(press(d(9999, 6, 1), "PageDown", day, true), "9999-12-31");
});

test("month level", () => {
  const month: GridNavContext = { ...day, level: "month" };
  const from = d(2026, 5, 1);
  assert.equal(press(from, "ArrowLeft", month), "2026-4-1");
  assert.equal(press(from, "ArrowRight", month), "2026-6-1");
  assert.equal(press(from, "ArrowUp", month), "2026-1-1");
  assert.equal(press(from, "ArrowDown", month), "2026-9-1");
  assert.equal(press(from, "ArrowDown", { ...month, columns: 3 }), "2026-8-1");
  assert.equal(press(from, "Home", month), "2026-1-1");
  assert.equal(press(from, "End", month), "2026-12-1");
  assert.equal(press(from, "PageUp", month), "2025-5-1");
  assert.equal(press(from, "PageDown", month, true), "2036-5-1");
  assert.equal(
    press(from, "ArrowRight", { ...month, direction: "rtl" }),
    "2026-4-1",
  );
});

test("year level", () => {
  const year: GridNavContext = { ...day, level: "year" };
  const from = d(2026, 5, 1);
  assert.equal(press(from, "ArrowLeft", year), "2025-5-1");
  assert.equal(press(from, "ArrowDown", year), "2030-5-1");
  assert.equal(press(from, "ArrowUp", year), "2022-5-1");
  assert.equal(press(from, "Home", year), "2020-5-1");
  assert.equal(press(from, "End", year), "2029-5-1");
  assert.equal(press(from, "PageDown", year), "2036-5-1");
  assert.equal(press(from, "PageUp", year, true), "1926-5-1");
});
