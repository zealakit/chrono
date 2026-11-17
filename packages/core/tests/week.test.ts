import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getIsoWeek,
  getLocaleWeek,
  getWeekInfo,
  plainDate,
} from "../dist/foundation/index.js";

test("ISO week numbers around the year edges", () => {
  assert.deepEqual(getIsoWeek(plainDate(2026, 1, 1)), { year: 2026, week: 1 });
  assert.deepEqual(getIsoWeek(plainDate(2020, 12, 31)), {
    year: 2020,
    week: 53,
  });
  assert.deepEqual(getIsoWeek(plainDate(2026, 12, 31)), {
    year: 2026,
    week: 53,
  });
  assert.deepEqual(getIsoWeek(plainDate(2027, 1, 1)), { year: 2026, week: 53 });
  assert.deepEqual(getIsoWeek(plainDate(2027, 1, 4)), { year: 2027, week: 1 });
  // Week 1 starting in December.
  assert.deepEqual(getIsoWeek(plainDate(2024, 12, 30)), {
    year: 2025,
    week: 1,
  });
  assert.deepEqual(getIsoWeek(plainDate(2021, 1, 3)), { year: 2020, week: 53 });
});

test("ISO weeks agree with a reference implementation for every day of 2015-2030", () => {
  const reference = (y: number, m: number, d: number) => {
    const date = new Date(Date.UTC(y, m - 1, d));
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const year = date.getUTCFullYear();
    const week = Math.ceil(
      ((date.getTime() - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7,
    );
    return { year, week };
  };
  for (let t = Date.UTC(2015, 0, 1); t < Date.UTC(2031, 0, 1); t += 86400000) {
    const d = new Date(t);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    assert.deepEqual(
      getIsoWeek(plainDate(y, m, day)),
      reference(y, m, day),
      `${y}-${m}-${day}`,
    );
  }
});

test("locale weeks follow first day and minimal days", () => {
  const date = plainDate(2026, 1, 1); // Thursday
  assert.deepEqual(getLocaleWeek(date, getWeekInfo("en-US")), {
    year: 2026,
    week: 1,
  });
  assert.deepEqual(getLocaleWeek(date, getWeekInfo("de-DE")), {
    year: 2026,
    week: 1,
  });
  assert.deepEqual(
    getLocaleWeek(plainDate(2026, 12, 31), getWeekInfo("en-US")),
    { year: 2027, week: 1 },
  );
  assert.deepEqual(
    getLocaleWeek(plainDate(2026, 12, 26), getWeekInfo("en-US")),
    { year: 2026, week: 52 },
  );
  // Saturday start (ar-EG): 2026-01-01 is a Thursday, so the week of Sat 2025-12-27 holds 5 days of 2026.
  assert.deepEqual(getLocaleWeek(date, { firstDay: 6, minimalDays: 1 }), {
    year: 2026,
    week: 1,
  });
  assert.deepEqual(
    getLocaleWeek(plainDate(2025, 12, 28), { firstDay: 6, minimalDays: 1 }),
    { year: 2026, week: 1 },
  );
  // he-IL: Sunday start, minimal days 1.
  assert.deepEqual(getLocaleWeek(plainDate(2026, 1, 4), getWeekInfo("he-IL")), {
    year: 2026,
    week: 2,
  });
  assert.equal(getWeekInfo("ar-EG").firstDay, 6);
  assert.equal(getWeekInfo("he-IL").firstDay, 7);
});
