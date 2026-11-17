import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getBuiltInViews,
  getMonthCount,
  resolveView,
  resolveViews,
} from "../dist/calendar/index.js";

const weekend = [6, 7] as const;

test("built-in views", () => {
  const views = getBuiltInViews(weekend);
  assert.deepEqual(Object.keys(views), [
    "month",
    "week",
    "workWeek",
    "day",
    "agenda",
    "multiMonth",
  ]);
  assert.deepEqual(views.month?.length, { months: 1 });
  assert.equal(views.month?.fixedWeeks, true);
  assert.equal(views.week?.layout, "time-grid");
  assert.deepEqual(views.workWeek?.hiddenDays, [6, 7]);
  assert.deepEqual(views.day?.length, { days: 1 });
  assert.deepEqual(views.agenda?.length, { days: 7 });
  assert.equal(views.agenda?.layout, "list");
  assert.equal(getMonthCount(views.multiMonth as never), 3);
  assert.equal(getMonthCount(views.month as never), 1);
});

test("custom definitions merge over built-ins and add new views", () => {
  const views = resolveViews(
    {
      threeDay: { layout: "time-grid", length: { days: 3 }, align: "day" },
      year: {
        layout: "month",
        length: { months: 12 },
        align: "year",
        months: 12,
      },
      agenda: { length: { months: 1 } } as never,
    },
    weekend,
  );
  assert.equal(views.threeDay?.id, "threeDay");
  assert.deepEqual(views.threeDay?.length, { days: 3 });
  assert.equal(getMonthCount(views.year as never), 12);
  // The override replaces only what it names.
  assert.equal(views.agenda?.layout, "list");
  assert.deepEqual(views.agenda?.length, { months: 1 });
});

test("a definition needs exactly one positive integer length", () => {
  for (const length of [
    {},
    { days: 1, weeks: 1 },
    { days: 0 },
    { weeks: 1.5 },
  ]) {
    assert.throws(
      () =>
        resolveViews(
          { bad: { layout: "list", length, align: "day" } },
          weekend,
        ),
      RangeError,
    );
  }
});

test("unknown ids throw in development and fall back to month in production", () => {
  const views = resolveViews(undefined, weekend);
  const env = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "development";
    assert.throws(
      () => resolveView(views, "nope"),
      /Unknown calendar view "nope"/,
    );
    process.env.NODE_ENV = "production";
    assert.equal(resolveView(views, "nope").id, "month");
    assert.equal(resolveView(views, "week").id, "week");
  } finally {
    if (env === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = env;
  }
});
