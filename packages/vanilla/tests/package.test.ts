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
    "cellDate",
    "checkDateRange",
    "compare",
    "compareYearMonth",
    "createAvailability",
    "createCalendar",
    "createDateInput",
    "createDatePanel",
    "createDateRangeInput",
    "createDateRangePanel",
    "createMiniCalendar",
    "createMultiDatePanel",
    "dateRangeLength",
    "formatDate",
    "fromInclusiveEndDate",
    "getCalendarTitle",
    "getDateStatus",
    "getNowIndicator",
    "getPresetRange",
    "getRange",
    "getVisibleRange",
    "initDateElements",
    "isDateInRange",
    "isDateSelectable",
    "isSameDay",
    "layoutAgenda",
    "layoutAllDayRow",
    "layoutMonthEvents",
    "layoutTimeGridEvents",
    "matchPreset",
    "normalizeDateRange",
    "normalizeEvents",
    "parseDate",
    "plainYearMonth",
    "toIsoString",
    "toPlainDate",
    "toPlainYearMonth",
  ]);
});
