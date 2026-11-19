import assert from "node:assert/strict";
import { test } from "node:test";
import { getPresetRange, matchPreset } from "../dist/date/index.js";
import { plainDate, toIsoString } from "../dist/foundation/index.js";

const range = (
  preset: Parameters<typeof getPresetRange>[0],
  today: string,
  extra = {},
) => {
  const [y, m, d] = today.split("-").map(Number) as [number, number, number];
  const r = getPresetRange(preset, { today: plainDate(y, m, d), ...extra });
  return `${toIsoString(r.start)}..${toIsoString(r.end)}`;
};

test("day based presets", () => {
  assert.equal(range("today", "2026-11-17"), "2026-11-17..2026-11-17");
  assert.equal(range("yesterday", "2026-03-01"), "2026-02-28..2026-02-28");
  assert.equal(range("last7Days", "2026-11-17"), "2026-11-11..2026-11-17");
  assert.equal(range("last30Days", "2026-11-17"), "2026-10-19..2026-11-17");
});

test("week presets respect weekStartsOn (7 week starts)", () => {
  // 2026-11-17 is a Tuesday.
  const expected: Record<number, string> = {
    1: "2026-11-16..2026-11-22",
    2: "2026-11-17..2026-11-23",
    3: "2026-11-11..2026-11-17",
    4: "2026-11-12..2026-11-18",
    5: "2026-11-13..2026-11-19",
    6: "2026-11-14..2026-11-20",
    7: "2026-11-15..2026-11-21",
  };
  for (let start = 1; start <= 7; start += 1) {
    assert.equal(
      range("thisWeek", "2026-11-17", { weekStartsOn: start }),
      expected[start],
    );
  }
  assert.equal(
    range("lastWeek", "2026-11-17", { weekStartsOn: 1 }),
    "2026-11-09..2026-11-15",
  );
});

test("month, quarter and year presets, including leap years", () => {
  assert.equal(range("thisMonth", "2028-02-10"), "2028-02-01..2028-02-29");
  assert.equal(range("lastMonth", "2026-01-15"), "2025-12-01..2025-12-31");
  assert.equal(range("thisQuarter", "2026-11-17"), "2026-10-01..2026-12-31");
  assert.equal(range("lastQuarter", "2026-01-05"), "2025-10-01..2025-12-31");
  assert.equal(range("yearToDate", "2026-11-17"), "2026-01-01..2026-11-17");
  assert.equal(range("thisYear", "2026-11-17"), "2026-01-01..2026-12-31");
  assert.equal(range("lastYear", "2026-11-17"), "2025-01-01..2025-12-31");
});

test("fiscal years starting in 1, 4, 7 and 10", () => {
  const today = "2026-11-17";
  assert.equal(
    range("thisYear", today, { fiscalYearStartMonth: 4 }),
    "2026-04-01..2027-03-31",
  );
  assert.equal(
    range("thisYear", today, { fiscalYearStartMonth: 7 }),
    "2026-07-01..2027-06-30",
  );
  assert.equal(
    range("thisYear", today, { fiscalYearStartMonth: 10 }),
    "2026-10-01..2027-09-30",
  );
  assert.equal(
    range("thisQuarter", today, { fiscalYearStartMonth: 4 }),
    "2026-10-01..2026-12-31",
  );
  assert.equal(
    range("thisQuarter", "2026-02-10", { fiscalYearStartMonth: 4 }),
    "2026-01-01..2026-03-31",
  );
  assert.equal(
    range("yearToDate", "2026-02-10", { fiscalYearStartMonth: 4 }),
    "2025-04-01..2026-02-10",
  );
});

test("custom presets: rolling and calendar", () => {
  assert.equal(
    range({ unit: "day", amount: 14, align: "rolling" }, "2026-11-17"),
    "2026-11-04..2026-11-17",
  );
  assert.equal(
    range({ unit: "month", amount: 3, align: "calendar" }, "2026-11-17"),
    "2026-09-01..2026-11-30",
  );
  assert.equal(
    range({ unit: "week", amount: 2, align: "rolling" }, "2026-11-17"),
    "2026-11-04..2026-11-17",
  );
});

test("matchPreset finds the pressed preset", () => {
  const ctx = { today: plainDate(2026, 11, 17) };
  const value = getPresetRange("last7Days", ctx);
  assert.equal(
    matchPreset(value, ["today", "last7Days", "last30Days"], ctx),
    "last7Days",
  );
  assert.equal(
    matchPreset({ start: value.start, end: null }, ["last7Days"], ctx),
    null,
  );
});
