import assert from "node:assert/strict";
import { test } from "node:test";
import {
  checkDateTimeRange,
  getBounds,
  getDayInstants,
  isDayDisabled,
  resolveWall,
  timeBoundsFor,
  toValueZone,
} from "../dist/datetime/index.js";
import {
  getTimeZoneLabel,
  plainDate,
  plainDateTime,
  plainTime,
  toIsoString,
} from "../dist/foundation/index.js";

const wall = (y: number, m: number, d: number, h: number, min: number) =>
  plainDateTime(plainDate(y, m, d), plainTime(h, min));
const hm = (z: { hour: number; minute: number; offset: number }) =>
  `${String(z.hour).padStart(2, "0")}:${String(z.minute).padStart(2, "0")}${z.offset >= 0 ? "+" : "-"}${Math.abs(z.offset) / 60}`;

test("resolveWall: the DST table of plan 08 §13.2", () => {
  const ny = resolveWall(wall(2026, 3, 8, 2, 30), "America/New_York");
  assert.equal(hm(ny.zoned), "03:30-4");
  assert.deepEqual([ny.adjusted, ny.ambiguous], [true, false]);
  const overlap = resolveWall(wall(2026, 11, 1, 1, 30), "America/New_York");
  assert.equal(hm(overlap.zoned), "01:30-4");
  assert.deepEqual([overlap.adjusted, overlap.ambiguous], [false, true]);
  const lordGap = resolveWall(wall(2026, 10, 4, 2, 15), "Australia/Lord_Howe");
  assert.equal(`${lordGap.zoned.hour}:${lordGap.zoned.minute}`, "2:45");
  assert.equal(lordGap.zoned.offset, 11 * 60);
  assert.equal(lordGap.adjusted, true);
  const lordOverlap = resolveWall(
    wall(2026, 4, 5, 1, 45),
    "Australia/Lord_Howe",
  );
  assert.equal(lordOverlap.zoned.offset, 11 * 60);
  assert.equal(lordOverlap.ambiguous, true);
  const plain = resolveWall(wall(2026, 6, 1, 9, 0), "Asia/Ho_Chi_Minh");
  assert.deepEqual(
    [plain.adjusted, plain.ambiguous, plain.zoned.offset],
    [false, false, 420],
  );
});

test("resolveWall: all four disambiguation values", () => {
  const gap = wall(2026, 3, 8, 2, 30);
  const ny = "America/New_York";
  assert.equal(resolveWall(gap, ny, "compatible").zoned.hour, 3);
  assert.equal(resolveWall(gap, ny, "later").zoned.hour, 3);
  assert.equal(resolveWall(gap, ny, "earlier").zoned.hour, 1);
  assert.throws(() => resolveWall(gap, ny, "reject"), RangeError);
  const overlap = wall(2026, 11, 1, 1, 30);
  assert.equal(resolveWall(overlap, ny, "earlier").zoned.offset, -240);
  assert.equal(resolveWall(overlap, ny, "later").zoned.offset, -300);
  assert.throws(() => resolveWall(overlap, ny, "reject"), RangeError);
});

test("value zone keeps the instant", () => {
  const zoned = resolveWall(
    wall(2026, 11, 17, 9, 30),
    "Asia/Ho_Chi_Minh",
  ).zoned;
  const utc = toValueZone(zoned, "UTC");
  assert.equal(toIsoString(utc), "2026-11-17T02:30:00+00:00[UTC]");
  assert.equal(toValueZone(zoned, undefined), zoned);
});

test("getDayInstants: counts and offsets on DST days (plan 08 §13.2)", () => {
  const count = (y: number, m: number, d: number, zone: string, step: number) =>
    getDayInstants(plainDate(y, m, d), zone, step).length;
  assert.equal(count(2026, 6, 1, "America/New_York", 60), 24);
  assert.equal(count(2026, 3, 8, "America/New_York", 60), 23);
  assert.equal(count(2026, 11, 1, "America/New_York", 60), 25);
  assert.equal(count(2026, 10, 4, "Australia/Lord_Howe", 30), 47);
  assert.equal(count(2026, 4, 5, "Australia/Lord_Howe", 30), 49);
  const repeated = getDayInstants(
    plainDate(2026, 11, 1),
    "America/New_York",
    60,
  ).filter((e) => e.time.hour === 1);
  assert.deepEqual(
    repeated.map((e) => [e.key, e.offset, e.ordinal]),
    [
      ["01:00", -240, 1],
      ["01:00#2", -300, 2],
    ],
  );
  assert.ok(
    repeated[0] && repeated[1] && repeated[0].instant < repeated[1].instant,
  );
  const gap = getDayInstants(plainDate(2026, 3, 8), "America/New_York", 60).map(
    (e) => e.key,
  );
  assert.ok(!gap.includes("02:00"));
});

test("bounds: boundary days, inclusive times, disablePast with injected now", () => {
  const b = getBounds({ min: "2026-11-17T14:30", timeZone: "UTC" });
  assert.equal(isDayDisabled(plainDate(2026, 11, 16), b), true);
  assert.equal(isDayDisabled(plainDate(2026, 11, 17), b), false);
  assert.deepEqual(
    timeBoundsFor(plainDate(2026, 11, 17), b).min,
    plainTime(14, 30),
  );
  assert.equal(timeBoundsFor(plainDate(2026, 11, 18), b).min, undefined);
  const past = getBounds({
    disablePast: true,
    timeZone: "UTC",
    now: Date.UTC(2026, 10, 17, 14, 37),
  });
  assert.equal(past.min?.minute, 37);
  const midnight = getBounds({
    disablePast: true,
    timeZone: "Asia/Ho_Chi_Minh",
    now: Date.UTC(2026, 10, 17, 17, 30),
  });
  assert.equal(midnight.min?.day, 18); // already tomorrow in Ho Chi Minh
  const later = getBounds({
    min: "2026-11-20T00:00",
    disablePast: true,
    timeZone: "UTC",
    now: Date.UTC(2026, 10, 17),
  });
  assert.equal(later.min?.day, 20);
  const converted = getBounds({
    min: "2026-11-17T02:30:00+00:00",
    timeZone: "Asia/Ho_Chi_Minh",
  });
  assert.equal(converted.min?.hour, 9);
});

test("checkDateTimeRange: instants when zoned, durations, reasons", () => {
  const a = resolveWall(wall(2026, 3, 8, 1, 0), "America/New_York").zoned;
  const b = resolveWall(wall(2026, 3, 8, 3, 0), "America/New_York").zoned;
  assert.deepEqual(checkDateTimeRange(a, b), { valid: true, duration: 60 }); // the gap hour is skipped
  assert.deepEqual(checkDateTimeRange(b, a), {
    valid: false,
    reason: "end-before-start",
  });
  assert.deepEqual(checkDateTimeRange(a, b, { minDuration: 90 }), {
    valid: false,
    reason: "too-short",
  });
  assert.deepEqual(checkDateTimeRange(a, b, { maxDuration: 30 }), {
    valid: false,
    reason: "too-long",
  });
  const bounds = getBounds({
    min: "2026-03-08T02:00",
    timeZone: "America/New_York",
  });
  assert.deepEqual(checkDateTimeRange(a, b, { bounds }), {
    valid: false,
    reason: "start-invalid",
  });
});

test("getTimeZoneLabel falls back and never throws", () => {
  assert.match(
    getTimeZoneLabel("Asia/Ho_Chi_Minh", "en-US"),
    /Vietnam|Indochina|Ho_Chi_Minh/,
  );
  assert.equal(getTimeZoneLabel("Not/AZone", "en-US"), "Not/AZone");
});
