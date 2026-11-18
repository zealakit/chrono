import assert from "node:assert/strict";
import { test } from "node:test";
import { expandRecurrence } from "../dist/calendar/index.js";
import { parseIsoDate } from "../dist/foundation/index.js";

const range = {
  start: parseIsoDate("1997-01-01"),
  end: parseIsoDate("1999-12-31"),
};

const dates = (rrule: string, start: string, end: string): string[] =>
  expandRecurrence({ id: "s", start, end, rrule }, range, {
    timeZone: "America/New_York",
  }).map((occurrence) => {
    const value = occurrence.start;
    return `${value.year}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}T${String(value.hour).padStart(2, "0")}:${String(value.minute).padStart(2, "0")}`;
  });

test("RFC 5545 daily count", () => {
  assert.deepEqual(
    dates("FREQ=DAILY;COUNT=10", "1997-09-02T09:00:00", "1997-09-02T10:00:00"),
    [
      "1997-09-02T09:00",
      "1997-09-03T09:00",
      "1997-09-04T09:00",
      "1997-09-05T09:00",
      "1997-09-06T09:00",
      "1997-09-07T09:00",
      "1997-09-08T09:00",
      "1997-09-09T09:00",
      "1997-09-10T09:00",
      "1997-09-11T09:00",
    ],
  );
});

test("RFC 5545 weekly count keeps the wall time across the EDT→EST change", () => {
  assert.deepEqual(
    dates("FREQ=WEEKLY;COUNT=10", "1997-09-02T09:00:00", "1997-09-02T10:00:00"),
    [
      "1997-09-02T09:00",
      "1997-09-09T09:00",
      "1997-09-16T09:00",
      "1997-09-23T09:00",
      "1997-09-30T09:00",
      "1997-10-07T09:00",
      "1997-10-14T09:00",
      "1997-10-21T09:00",
      "1997-10-28T09:00",
      "1997-11-04T09:00",
    ],
  );
});

test("RFC 5545 WKST changes a two-week TU,SU series", () => {
  const rrule = "FREQ=WEEKLY;INTERVAL=2;COUNT=4;BYDAY=TU,SU";
  assert.deepEqual(
    dates(`${rrule};WKST=MO`, "1997-08-05T09:00:00", "1997-08-05T10:00:00"),
    [
      "1997-08-05T09:00",
      "1997-08-10T09:00",
      "1997-08-19T09:00",
      "1997-08-24T09:00",
    ],
  );
  assert.deepEqual(
    dates(`${rrule};WKST=SU`, "1997-08-05T09:00:00", "1997-08-05T10:00:00"),
    [
      "1997-08-05T09:00",
      "1997-08-17T09:00",
      "1997-08-19T09:00",
      "1997-08-31T09:00",
    ],
  );
});

test("RFC 5545 monthly ordinal BYDAY", () => {
  assert.deepEqual(
    dates(
      "FREQ=MONTHLY;COUNT=10;BYDAY=1FR",
      "1997-09-05T09:00:00",
      "1997-09-05T10:00:00",
    ),
    [
      "1997-09-05T09:00",
      "1997-10-03T09:00",
      "1997-11-07T09:00",
      "1997-12-05T09:00",
      "1998-01-02T09:00",
      "1998-02-06T09:00",
      "1998-03-06T09:00",
      "1998-04-03T09:00",
      "1998-05-01T09:00",
      "1998-06-05T09:00",
    ],
  );
  assert.deepEqual(
    dates(
      "FREQ=MONTHLY;COUNT=6;BYDAY=-2MO",
      "1997-09-22T09:00:00",
      "1997-09-22T10:00:00",
    ),
    [
      "1997-09-22T09:00",
      "1997-10-20T09:00",
      "1997-11-17T09:00",
      "1997-12-22T09:00",
      "1998-01-19T09:00",
      "1998-02-16T09:00",
    ],
  );
});

test("RFC 5545 yearly BYMONTH and Friday the 13th", () => {
  assert.deepEqual(
    dates(
      "FREQ=YEARLY;COUNT=6;BYMONTH=6,7",
      "1997-06-10T09:00:00",
      "1997-06-10T10:00:00",
    ),
    [
      "1997-06-10T09:00",
      "1997-07-10T09:00",
      "1998-06-10T09:00",
      "1998-07-10T09:00",
      "1999-06-10T09:00",
      "1999-07-10T09:00",
    ],
  );
  assert.deepEqual(
    dates(
      "FREQ=MONTHLY;COUNT=4;BYDAY=FR;BYMONTHDAY=13",
      "1997-09-02T09:00:00",
      "1997-09-02T10:00:00",
    ),
    [
      "1997-09-02T09:00",
      "1998-02-13T09:00",
      "1998-03-13T09:00",
      "1998-11-13T09:00",
    ],
  );
});

test("Chrono cases: monthly 31st and yearly February 29 are skipped", () => {
  const late = {
    start: parseIsoDate("2024-01-01"),
    end: parseIsoDate("2032-12-31"),
  };
  const lateDates = (rrule: string, start: string, end: string): string[] =>
    expandRecurrence({ id: "s", start, end, rrule }, late, {
      timeZone: "America/New_York",
    }).map((occurrence) => {
      const value = occurrence.start;
      return `${value.year}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}T${String(value.hour).padStart(2, "0")}:${String(value.minute).padStart(2, "0")}`;
    });
  assert.deepEqual(
    lateDates(
      "FREQ=MONTHLY;COUNT=4",
      "2026-01-31T09:00:00",
      "2026-01-31T10:00:00",
    ),
    [
      "2026-01-31T09:00",
      "2026-03-31T09:00",
      "2026-05-31T09:00",
      "2026-07-31T09:00",
    ],
  );
  assert.deepEqual(
    lateDates(
      "FREQ=YEARLY;COUNT=3",
      "2024-02-29T09:00:00",
      "2024-02-29T10:00:00",
    ),
    ["2024-02-29T09:00", "2028-02-29T09:00", "2032-02-29T09:00"],
  );
});
