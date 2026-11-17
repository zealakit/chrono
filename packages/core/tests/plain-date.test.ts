import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  dayOfWeek,
  dayOfYear,
  daysInMonth,
  daysInYear,
  diffDays,
  endOfMonth,
  endOfWeek,
  endOfYear,
  isLeapYear,
  isValidDate,
  plainDate,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "../dist/foundation/index.js";

const ymd = (d: { year: number; month: number; day: number }) =>
  `${d.year}-${d.month}-${d.day}`;

test("plainDate validates and freezes", () => {
  const date = plainDate(2026, 11, 17);
  assert.equal(date.calendar, "gregory");
  assert.ok(Object.isFrozen(date));
  for (const bad of [
    [0, 1, 1],
    [10000, 1, 1],
    [2026, 13, 1],
    [2026, 0, 1],
    [2026, 2, 29],
    [2026, 1.5, 1],
  ] as [number, number, number][]) {
    assert.throws(() => plainDate(...bad), RangeError, bad.join("-"));
    assert.equal(isValidDate(...bad), false);
  }
  assert.equal(
    ymd(plainDate(2026, 2, 31, { overflow: "constrain" })),
    "2026-2-28",
  );
  assert.throws(
    () => plainDate(2026, 13, 1, { overflow: "constrain" }),
    RangeError,
  );
});

test("calendar facts", () => {
  assert.equal(daysInMonth(2024, 2), 29);
  assert.equal(daysInMonth(2100, 2), 28);
  assert.equal(daysInYear(2000), 366);
  assert.equal(isLeapYear(1900), false);
  assert.equal(dayOfWeek(plainDate(2026, 11, 17)), 2); // Tuesday
  assert.equal(dayOfWeek(plainDate(2026, 11, 22)), 7); // Sunday
  assert.equal(dayOfYear(plainDate(2024, 12, 31)), 366);
  assert.equal(dayOfYear(plainDate(2026, 1, 1)), 1);
});

test("addMonths constrains month-end overflow (D5)", () => {
  assert.equal(ymd(addMonths(plainDate(2026, 1, 31), 1)), "2026-2-28");
  assert.equal(ymd(addMonths(plainDate(2024, 1, 31), 1)), "2024-2-29");
  assert.equal(ymd(addMonths(plainDate(2026, 3, 31), -1)), "2026-2-28");
  assert.equal(ymd(addMonths(plainDate(2026, 11, 15), 3)), "2027-2-15");
  assert.equal(ymd(addMonths(plainDate(2026, 1, 15), -13)), "2024-12-15");
  assert.throws(
    () => addMonths(plainDate(2026, 1, 31), 1, { overflow: "reject" }),
    RangeError,
  );
});

test("Feb 29 plus a year, and negative amounts", () => {
  assert.equal(ymd(addYears(plainDate(2024, 2, 29), 1)), "2025-2-28");
  assert.equal(ymd(addYears(plainDate(2024, 2, 29), 4)), "2028-2-29");
  assert.equal(ymd(addYears(plainDate(2024, 2, 29), -1)), "2023-2-28");
  assert.equal(ymd(addDays(plainDate(2026, 3, 1), -1)), "2026-2-28");
  assert.equal(ymd(addWeeks(plainDate(2026, 12, 31), 1)), "2027-1-7");
  assert.equal(diffDays(plainDate(2026, 11, 17), plainDate(2026, 11, 10)), 7);
  assert.equal(diffDays(plainDate(2026, 1, 1), plainDate(2027, 1, 1)), -365);
});

test("year bounds (D3)", () => {
  assert.throws(() => addDays(plainDate(1, 1, 1), -1), RangeError);
  assert.throws(() => addDays(plainDate(9999, 12, 31), 1), RangeError);
  assert.throws(() => addYears(plainDate(9999, 1, 1), 1), RangeError);
  assert.equal(ymd(addDays(plainDate(1, 1, 1), 1)), "1-1-2");
});

test("results are frozen", () => {
  assert.ok(Object.isFrozen(addDays(plainDate(2026, 1, 1), 1)));
  assert.ok(Object.isFrozen(addMonths(plainDate(2026, 1, 1), 1)));
});

test("boundaries", () => {
  const date = plainDate(2026, 11, 17); // Tuesday
  assert.equal(ymd(startOfWeek(date, 1)), "2026-11-16");
  assert.equal(ymd(endOfWeek(date, 1)), "2026-11-22");
  assert.equal(ymd(startOfWeek(date, 7)), "2026-11-15");
  assert.equal(ymd(endOfWeek(date, 7)), "2026-11-21");
  assert.equal(ymd(startOfWeek(date, 2)), "2026-11-17");
  assert.equal(ymd(startOfMonth(date)), "2026-11-1");
  assert.equal(ymd(endOfMonth(date)), "2026-11-30");
  assert.equal(ymd(startOfYear(date)), "2026-1-1");
  assert.equal(ymd(endOfYear(date)), "2026-12-31");
});
