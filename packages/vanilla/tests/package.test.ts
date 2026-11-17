import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { resetDom } from "./support/dom.ts";

beforeEach(resetDom);

test("resolves @zealakit/chrono-core from the workspace build", async () => {
  const resolved = import.meta.resolve("@zealakit/chrono-core");
  assert.match(resolved, /\/packages\/core\/dist\/index\.js$/);
  await import("@zealakit/chrono-core");
});

test("the public surface is the documented set", async () => {
  const names = Object.keys(await import("../dist/index.js")).sort();
  assert.deepEqual(names, [
    "applyAttributes",
    "applyEventLimit",
    "createCalendar",
    "createMiniCalendar",
    "fromInclusiveEndDate",
    "getCalendarTitle",
    "getNowIndicator",
    "getRange",
    "getVisibleRange",
    "isSameDay",
    "layoutAgenda",
    "layoutAllDayRow",
    "layoutMonthEvents",
    "layoutTimeGridEvents",
    "normalizeEvents",
    "toIsoString",
    "toPlainDate",
  ]);
});
