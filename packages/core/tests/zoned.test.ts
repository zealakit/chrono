import assert from "node:assert/strict";
import { test } from "node:test";
import {
  fromInstant,
  getOffset,
  isValidTimeZone,
  plainDate,
  plainDateTime,
  plainTime,
  toInstant,
  toZoned,
  withTimeZone,
} from "../dist/foundation/index.js";

const wall = (y: number, m: number, d: number, h: number, mi = 0, s = 0) =>
  plainDateTime(plainDate(y, m, d), plainTime(h, mi, s));
const NY = "America/New_York";
const LH = "Australia/Lord_Howe";

function transitions(
  zone: string,
  year: number,
  stepMinutes: number,
): { at: number; from: number; to: number }[] {
  const found: { at: number; from: number; to: number }[] = [];
  let previous = getOffset(Date.UTC(year, 0, 1), zone);
  for (
    let t = Date.UTC(year, 0, 1);
    t < Date.UTC(year + 1, 0, 1);
    t += stepMinutes * 60000
  ) {
    const offset = getOffset(t, zone);
    if (offset !== previous) {
      found.push({ at: t, from: previous, to: offset });
      previous = offset;
    }
  }
  return found;
}

test("every 2026 DST transition in New York and Lord Howe", () => {
  assert.deepEqual(transitions(NY, 2026, 15), [
    { at: Date.UTC(2026, 2, 8, 7), from: -300, to: -240 },
    { at: Date.UTC(2026, 10, 1, 6), from: -240, to: -300 },
  ]);
  // Lord Howe shifts by 30 minutes: +11:00 -> +10:30 in April, +10:30 -> +11:00 in October.
  assert.deepEqual(transitions(LH, 2026, 15), [
    { at: Date.UTC(2026, 3, 4, 15), from: 660, to: 630 },
    { at: Date.UTC(2026, 9, 3, 15, 30), from: 630, to: 660 },
  ]);
});

test("DST gap: 2026-03-08 02:30 does not exist in New York", () => {
  const input = wall(2026, 3, 8, 2, 30);
  const compatible = toZoned(input, NY);
  assert.deepEqual(
    [compatible.hour, compatible.minute, compatible.offset],
    [3, 30, -240],
  );
  assert.deepEqual(toZoned(input, NY, "later"), compatible);
  const earlier = toZoned(input, NY, "earlier");
  assert.deepEqual(
    [earlier.hour, earlier.minute, earlier.offset],
    [1, 30, -300],
  );
  assert.throws(() => toZoned(input, NY, "reject"), RangeError);
});

test("DST overlap: 2026-11-01 01:30 happens twice in New York", () => {
  const input = wall(2026, 11, 1, 1, 30);
  assert.equal(toZoned(input, NY).offset, -240);
  assert.equal(toZoned(input, NY, "earlier").offset, -240);
  assert.equal(toZoned(input, NY, "later").offset, -300);
  assert.throws(() => toZoned(input, NY, "reject"), RangeError);
  assert.ok(
    toInstant(toZoned(input, NY, "later")) -
      toInstant(toZoned(input, NY, "earlier")) ===
      3600000,
  );
});

test("Lord Howe 30-minute shifts", () => {
  const gap = toZoned(wall(2026, 10, 4, 2, 15), LH);
  assert.deepEqual([gap.hour, gap.minute, gap.offset], [2, 45, 660]);
  const gapEarlier = toZoned(wall(2026, 10, 4, 2, 15), LH, "earlier");
  assert.deepEqual(
    [gapEarlier.hour, gapEarlier.minute, gapEarlier.offset],
    [1, 45, 630],
  );
  const overlap = wall(2026, 4, 5, 1, 45);
  assert.equal(toZoned(overlap, LH).offset, 660);
  assert.equal(toZoned(overlap, LH, "later").offset, 630);
  assert.throws(() => toZoned(overlap, LH, "reject"), RangeError);
});

test("ordinary times keep their wall fields", () => {
  const value = toZoned(wall(2026, 7, 4, 12, 0), NY, "reject");
  assert.deepEqual([value.hour, value.offset, value.timeZone], [12, -240, NY]);
  assert.ok(Object.isFrozen(value));
});

test("Ho Chi Minh has no DST; UTC and fixed offsets work", () => {
  for (const month of [1, 4, 7, 10]) {
    assert.equal(
      toZoned(wall(2026, month, 15, 12), "Asia/Ho_Chi_Minh").offset,
      420,
    );
  }
  assert.equal(toZoned(wall(2026, 7, 1, 0), "UTC").offset, 0);
  const fixed = toZoned(wall(2026, 7, 1, 12), "+05:45");
  assert.deepEqual([fixed.offset, fixed.timeZone], [345, "+05:45"]);
  assert.equal(getOffset(0, "-08:00"), -480);
});

test("instants round trip and zones convert", () => {
  const instant = Date.UTC(2026, 10, 17, 23, 30);
  const hcm = fromInstant(instant, "Asia/Ho_Chi_Minh");
  assert.deepEqual([hcm.day, hcm.hour, hcm.minute], [18, 6, 30]);
  assert.equal(toInstant(hcm), instant);
  const ny = withTimeZone(hcm, NY);
  assert.deepEqual([ny.day, ny.hour, ny.offset], [17, 18, -300]);
  assert.equal(toInstant(ny), instant);
  const early = fromInstant(Date.UTC(1969, 11, 31, 23, 59, 59), "UTC");
  assert.deepEqual([early.year, early.second], [1969, 59]);
});

test("isValidTimeZone", () => {
  assert.equal(isValidTimeZone("Asia/Ho_Chi_Minh"), true);
  assert.equal(isValidTimeZone("UTC"), true);
  assert.equal(isValidTimeZone("+05:30"), true);
  assert.equal(isValidTimeZone("Mars/Olympus"), false);
  assert.equal(isValidTimeZone(""), false);
  assert.throws(() => toZoned(wall(2026, 1, 1, 0), "Mars/Olympus"), RangeError);
});
