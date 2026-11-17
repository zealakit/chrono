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
    "checkTimeRangeValue",
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
    "createTimeInput",
    "createTimePanel",
    "createTimeRangeInput",
    "createTimeRangePanel",
    "dateRangeLength",
    "formatDate",
    "fromInclusiveEndDate",
    "getBookingSlots",
    "getCalendarTitle",
    "getDateStatus",
    "getHourCycle",
    "getNowIndicator",
    "getPresetRange",
    "getRange",
    "getTimeStatus",
    "getVisibleRange",
    "initDateElements",
    "initTimeElements",
    "isDateInRange",
    "isDateSelectable",
    "isSameDay",
    "isSameTime",
    "layoutAgenda",
    "layoutAllDayRow",
    "layoutMonthEvents",
    "layoutTimeGridEvents",
    "matchPreset",
    "normalizeDateRange",
    "normalizeEvents",
    "parseDate",
    "parseTime",
    "plainYearMonth",
    "snapTime",
    "toIsoString",
    "toPlainDate",
    "toPlainTime",
    "toPlainYearMonth",
  ]);
});
