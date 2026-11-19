import assert from "node:assert/strict";
import { test } from "node:test";
import { checkTimeRangeValue, getBookingSlots } from "../dist/time/index.js";
import { plainTime } from "../dist/foundation/index.js";

const keys = (slots: { key: string }[]) => slots.map((s) => s.key);

test("slots: generation table (plan 07 §13.2)", () => {
  assert.deepEqual(
    keys(getBookingSlots({ start: "09:00", end: "12:00", slotDuration: 30 })),
    ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"],
  );
  assert.deepEqual(
    keys(
      getBookingSlots({
        start: "09:00",
        end: "11:00",
        slotDuration: 60,
        step: 30,
      }),
    ),
    ["09:00", "09:30", "10:00"],
  );
  const late = getBookingSlots({ start: "23:00", slotDuration: 30 });
  assert.deepEqual(keys(late), ["23:00", "23:30"]);
  assert.equal(late[1]?.endSecond, 86400);
  assert.equal(late[1]?.end.hour, 0);
  assert.deepEqual(
    getBookingSlots({ start: "09:00", end: "09:20", slotDuration: 30 }),
    [],
  );
});

test("slots: explicit slots win, sort, dedupe and carry data", () => {
  const slots = getBookingSlots({
    slotDuration: 30,
    slots: [
      { start: "10:00", data: { who: "Ann" } },
      { start: "09:00", end: "09:45", available: false },
      { start: "10:00", data: { who: "dup" } },
    ],
  });
  assert.deepEqual(keys(slots), ["09:00", "10:00"]);
  assert.deepEqual(slots[1]?.data, { who: "Ann" });
  assert.equal(slots[0]?.available, false);
  assert.equal(slots[0]?.endSecond, 9 * 3600 + 45 * 60);
});

test("slots: availability from constraints and disabled ranges", () => {
  const slots = getBookingSlots({
    start: "09:00",
    end: "12:00",
    slotDuration: 30,
    disabledRanges: [{ start: "10:15", end: "10:45" }],
    isTimeUnavailable: (t) => t.hour === 11 && t.minute === 0,
    min: "09:30",
  });
  const free = Object.fromEntries(slots.map((s) => [s.key, s.available]));
  assert.deepEqual(free, {
    "09:00": false,
    "09:30": true,
    "10:00": false,
    "10:30": false,
    "11:00": false,
    "11:30": true,
  });
});

test("range: ordering, overnight, durations", () => {
  const t = (h: number, m = 0) => plainTime(h, m);
  assert.deepEqual(checkTimeRangeValue(t(9), t(17)), {
    valid: true,
    duration: 480,
    crossesMidnight: false,
  });
  assert.deepEqual(checkTimeRangeValue(t(17), t(9)), {
    valid: false,
    reason: "end-before-start",
  });
  assert.deepEqual(checkTimeRangeValue(t(9), t(9), { allowOvernight: true }), {
    valid: false,
    reason: "end-before-start",
  });
  assert.deepEqual(checkTimeRangeValue(t(23), t(2), { allowOvernight: true }), {
    valid: true,
    duration: 180,
    crossesMidnight: true,
  });
  assert.deepEqual(checkTimeRangeValue(t(22), t(0)), {
    valid: true,
    duration: 120,
    crossesMidnight: false,
  });
  assert.deepEqual(checkTimeRangeValue(t(9), t(10), { minDuration: 90 }), {
    valid: false,
    reason: "too-short",
  });
  assert.deepEqual(checkTimeRangeValue(t(9), t(12), { maxDuration: 90 }), {
    valid: false,
    reason: "too-long",
  });
  assert.deepEqual(checkTimeRangeValue(t(9), t(10), { min: t(10) }), {
    valid: false,
    reason: "start-invalid",
  });
});
