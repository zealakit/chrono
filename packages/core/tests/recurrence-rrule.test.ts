import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type RRule,
  parseRRule,
  stringifyRRule,
} from "../dist/calendar/index.js";

const codes = (text: string): string => {
  try {
    parseRRule(text);
    return "ok";
  } catch (error) {
    return (error as { code: string }).code;
  }
};

test("parseRRule round trips the supported subset", () => {
  const rules = [
    "FREQ=DAILY",
    "FREQ=DAILY;INTERVAL=2;COUNT=10",
    "FREQ=WEEKLY;BYDAY=MO,WE,FR;WKST=SU",
    "FREQ=MONTHLY;BYDAY=2TU,-1FR",
    "FREQ=MONTHLY;BYMONTHDAY=1,-1",
    "FREQ=YEARLY;BYMONTH=6,7;BYMONTHDAY=10",
    "FREQ=WEEKLY;UNTIL=20261231T235959Z",
    "FREQ=DAILY;UNTIL=20261231",
  ];
  for (const text of rules) {
    assert.equal(stringifyRRule(parseRRule(text)), text);
  }
});

test("parseRRule accepts an RRULE prefix and a rule object", () => {
  assert.equal(parseRRule("RRULE:FREQ=DAILY").freq, "DAILY");
  const rule: RRule = {
    freq: "WEEKLY",
    interval: 2,
    byDay: [{ day: 2 }, { day: 7 }],
  };
  assert.deepEqual(parseRRule(rule), rule);
});

test("parseRRule rejects unsupported parts", () => {
  assert.equal(codes("FREQ=DAILY;BYSETPOS=1"), "unsupported-part");
  assert.equal(codes("FREQ=HOURLY"), "unsupported-part");
  assert.equal(codes("FREQ=YEARLY;BYDAY=20MO"), "unsupported-part");
  assert.equal(codes("FREQ=DAILY;BYHOUR=9"), "unsupported-part");
});

test("parseRRule rejects invalid values and conflicts", () => {
  assert.equal(codes("FREQ=DAILY;COUNT=1;UNTIL=20261231"), "conflict");
  assert.equal(codes("FREQ=DAILY;INTERVAL=0"), "invalid-value");
  assert.equal(codes("FREQ=DAILY;COUNT=0"), "invalid-value");
  assert.equal(codes("FREQ=WEEKLY;BYDAY=1MO"), "invalid-value");
  assert.equal(codes("FREQ=MONTHLY;BYMONTHDAY=0"), "invalid-value");
  assert.equal(codes("FREQ=MONTHLY;BYMONTH=13"), "invalid-value");
  assert.equal(codes("FREQ=DAILY;UNTIL=20261301"), "invalid-value");
  assert.equal(codes("FREQ=DAILY;FREQ=WEEKLY"), "conflict");
});

test("stringifyRRule keeps the fixed part order", () => {
  assert.equal(
    stringifyRRule({
      freq: "MONTHLY",
      wkst: 1,
      byDay: [{ day: 5, ordinal: -1 }],
      byMonth: [11],
      count: 5,
      interval: 2,
    }),
    "FREQ=MONTHLY;INTERVAL=2;COUNT=5;BYMONTH=11;BYDAY=-1FR;WKST=MO",
  );
});
