import assert from "node:assert/strict";
import { test } from "node:test";
import { expandRecurrence } from "../dist/calendar/index.js";
import {
  type DateRange,
  parseIsoDate,
  toEpochDay,
  toIsoString,
} from "../dist/foundation/index.js";

const wide: DateRange = {
  start: parseIsoDate("2020-01-01"),
  end: parseIsoDate("2030-12-31"),
};
const narrow: DateRange = {
  start: parseIsoDate("2022-06-01"),
  end: parseIsoDate("2022-08-31"),
};

const templates = [
  "FREQ=DAILY",
  "FREQ=DAILY;INTERVAL=3;BYDAY=MO,WE,FR",
  "FREQ=WEEKLY;BYDAY=TU,TH",
  "FREQ=WEEKLY;INTERVAL=2;BYDAY=SU;WKST=SU",
  "FREQ=MONTHLY;BYDAY=1FR",
  "FREQ=MONTHLY;BYMONTHDAY=-1",
  "FREQ=MONTHLY;BYDAY=FR;BYMONTHDAY=13",
  "FREQ=YEARLY;BYMONTH=3,4",
  "FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
];

function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

test("range-limited expansion equals the wide expansion clipped to the range", () => {
  const random = seeded(42);
  for (let index = 0; index < 1000; index += 1) {
    const template = templates[index % templates.length] as string;
    const interval = 1 + Math.floor(random() * 3);
    const counted = random() < 0.5;
    const count = 300 + Math.floor(random() * 600);
    const rrule = counted ? `${template};COUNT=${count}` : template;
    const startDay = 1 + Math.floor(random() * 27);
    const month = 1 + Math.floor(random() * 12);
    const series = {
      id: `s${index}`,
      start: `2021-${String(month).padStart(2, "0")}-${String(startDay).padStart(2, "0")}T09:00:00`,
      end: `2021-${String(month).padStart(2, "0")}-${String(startDay).padStart(2, "0")}T10:00:00`,
      rrule: interval === 1 ? rrule : `${rrule};INTERVAL=${interval}`,
    };
    const full = expandRecurrence(series, wide, { timeZone: "UTC" });
    const clipped = full.filter((occurrence) => {
      const day = toEpochDay(occurrence.start);
      return day >= toEpochDay(narrow.start) && day <= toEpochDay(narrow.end);
    });
    const limited = expandRecurrence(series, narrow, { timeZone: "UTC" });
    assert.deepEqual(
      limited.map((occurrence) => toIsoString(occurrence.start)),
      clipped.map((occurrence) => toIsoString(occurrence.start)),
      `rule ${series.rrule} from ${series.start}`,
    );
  }
});

test("the iteration cap reports once and stops", () => {
  const errors: string[] = [];
  const series = {
    id: "cap",
    start: "1900-01-01T09:00:00",
    end: "1900-01-01T10:00:00",
    rrule: "FREQ=DAILY;COUNT=20000",
  };
  const occurrences = expandRecurrence(series, narrow, {
    timeZone: "UTC",
    onError: (error) => errors.push(error.code),
  });
  assert.deepEqual(errors, ["iteration-cap"]);
  assert.deepEqual(occurrences, []);
});
