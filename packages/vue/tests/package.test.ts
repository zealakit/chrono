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
  assert.equal(
    names.filter((name) => /^(Calendar|MiniCalendar)/.test(name)).length,
    28,
  );
  for (const name of [
    "useCalendar",
    "useMiniCalendar",
    "getCalendarTitle",
    "getRange",
    "getVisibleRange",
    "layoutMonthEvents",
    "layoutTimeGridEvents",
    "layoutAgenda",
    "fromInclusiveEndDate",
    "isSameDay",
    "toIsoString",
    "toPlainDate",
  ]) {
    assert.ok(names.includes(name), name);
  }
  assert.equal(
    names.filter((name) => /^(Date|MultiDate)/.test(name)).length,
    20,
  );
  for (const name of [
    "useDateInput",
    "useDateRangeInput",
    "useDatePanel",
    "useDateRangePanel",
    "useMultiDatePanel",
    "parseDate",
    "getPresetRange",
    "matchPreset",
  ]) {
    assert.ok(names.includes(name), name);
  }
  assert.equal(names.length, 84);
});
