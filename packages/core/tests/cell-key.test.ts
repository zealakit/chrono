import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseCellKey,
  splitProperties,
  type Attributes,
} from "../dist/foundation/index.js";

test("parseCellKey parses a day key and a slot key", () => {
  assert.deepEqual(parseCellKey("2026-11-17"), {
    date: { calendar: "gregory", year: 2026, month: 11, day: 17 },
  });
  const slot = parseCellKey("2026-11-17T09:30");
  assert.deepEqual(slot, {
    date: { calendar: "gregory", year: 2026, month: 11, day: 17 },
    time: { hour: 9, minute: 30, second: 0 },
  });
});

test("splitProperties separates --chrono-* properties from attributes", () => {
  const record: Attributes = {
    role: "button",
    "data-selected": true,
    "data-absent": false,
    "--chrono-event-top": 0.375,
    "--chrono-event-height": 0.5,
  };
  const { attributes, properties } = splitProperties(record);
  assert.deepEqual(attributes, {
    role: "button",
    "data-selected": true,
    "data-absent": false,
  });
  assert.deepEqual(properties, {
    "--chrono-event-top": "0.375",
    "--chrono-event-height": "0.5",
  });
});
