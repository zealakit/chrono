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
    "buildResourceTree",
    "cellDate",
    "checkDateRange",
    "checkDateTimeRange",
    "checkTimeRangeValue",
    "compare",
    "compareYearMonth",
    "createAvailability",
    "createCalendar",
    "createDateInput",
    "createDatePanel",
    "createDateRangeInput",
    "createDateRangePanel",
    "createDateTimeInput",
    "createDateTimePanel",
    "createDateTimeRangeInput",
    "createDateTimeRangePanel",
    "createMiniCalendar",
    "createMultiDatePanel",
    "createTimeInput",
    "createTimePanel",
    "createTimeRangeInput",
    "createTimeRangePanel",
    "dateRangeLength",
    "formatDate",
    "formatDateTime",
    "fromInclusiveEndDate",
    "fromInstant",
    "getBookingSlots",
    "getCalendarTitle",
    "getDateStatus",
    "getDayInstants",
    "getHourCycle",
    "getNowIndicator",
    "getPresetRange",
    "getRange",
    "getTimeStatus",
    "getTimeZoneLabel",
    "getVisibleRange",
    "initDateElements",
    "initDateTimeElements",
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
    "parseDateTime",
    "parseTime",
    "plainYearMonth",
    "resolveWall",
    "resourceCellKey",
    "resourceViews",
    "snapTime",
    "toInstant",
    "toIsoString",
    "toPlainDate",
    "toPlainTime",
    "toPlainYearMonth",
    "toZoned",
    "withTimeZone",
    "zoomTarget",
  ]);
});
