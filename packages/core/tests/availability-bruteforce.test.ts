import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createAvailability,
  dayOfWeek,
  fromInstant,
  plainDate,
  plainDateTime,
  plainTime,
  toInstant,
  toZoned,
  type AvailabilityRule,
  type AvailabilitySpec,
  type DayOfWeek,
  type PlainDate,
} from "../dist/foundation/index.js";

const d = (year: number, month: number, day: number): PlainDate =>
  plainDate(year, month, day);

/** Deterministic PRNG so a failure can be replayed. */
function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

const ZONES = [
  "UTC",
  "Asia/Ho_Chi_Minh",
  "America/New_York",
  "Australia/Lord_Howe",
];
const DAYS: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 7];

const token = (minutes: number): string =>
  `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

function randomRule(random: () => number): AvailabilityRule {
  const kind = Math.floor(random() * 4);
  const start = Math.floor(random() * 22) * 60;
  if (kind === 0) {
    return {
      type: "daily",
      start: token(start),
      end: token(start + 60 + Math.floor(random() * 6 * 60)),
    };
  }
  if (kind === 1) {
    const days = Array.from(
      { length: 1 + Math.floor(random() * 3) },
      () => DAYS[Math.floor(random() * 7)] as DayOfWeek,
    );
    return { type: "weekly", days };
  }
  if (kind === 2) {
    return {
      type: "dates",
      dates: [d(2026, 11, 15 + Math.floor(random() * 8))],
      start: token(start),
      end: token(start + 60 + Math.floor(random() * 3 * 60)),
    };
  }
  const from = d(2026, 11, 15 + Math.floor(random() * 5));
  return { type: "range", start: from, end: d(2026, 11, from.day + 1) };
}

function randomSpec(random: () => number, zone: string): AvailabilitySpec {
  const count = Math.floor(random() * 5);
  const open: AvailabilityRule[] = [];
  const blocked: AvailabilityRule[] = [];
  for (let index = 0; index < count; index += 1) {
    (random() < 0.6 ? open : blocked).push(randomRule(random));
  }
  return {
    timeZone: zone,
    ...(random() < 0.7 ? { open } : {}),
    blocked,
  };
}

const minutesOf = (time: { hour: number; minute: number }): number =>
  time.hour * 60 + time.minute;

function timeInWindow(minutes: number, start: string, end: string): boolean {
  const from = Number(start.slice(0, 2)) * 60 + Number(start.slice(3, 5));
  const to = Number(end.slice(0, 2)) * 60 + Number(end.slice(3, 5));
  return from <= to
    ? minutes >= from && minutes < to
    : minutes >= from || minutes < to;
}

const startOfDayMs = (date: PlainDate, zone: string): number =>
  toInstant(toZoned(plainDateTime(date, plainTime(0, 0)), zone));

/** The oracle: is this instant inside the rule's wall window (spec zone == display zone)? */
function matches(
  rule: AvailabilityRule,
  wall: ReturnType<typeof fromInstant>,
  zone: string,
  ms: number,
): boolean {
  if (rule.type === "range") {
    return (
      ms >= startOfDayMs(rule.start as PlainDate, zone) &&
      ms < startOfDayMs(rule.end as PlainDate, zone)
    );
  }
  const minutes = minutesOf(wall);
  if (rule.type === "daily") {
    return timeInWindow(minutes, rule.start, rule.end);
  }
  if (rule.type === "weekly" && !rule.days.includes(dayOfWeek(wall))) {
    return false;
  }
  if (rule.type === "dates") {
    const hit = rule.dates.some((date) =>
      typeof date === "string"
        ? date ===
          `${wall.year}-${String(wall.month).padStart(2, "0")}-${String(wall.day).padStart(2, "0")}`
        : date.year === wall.year &&
          date.month === wall.month &&
          date.day === wall.day,
    );
    if (!hit) return false;
  }
  return rule.end === "24:00" || rule.end === undefined
    ? minutes >= Number((rule.start ?? "00:00").slice(0, 2)) * 60
    : timeInWindow(minutes, rule.start ?? "00:00", rule.end);
}

function naiveAvailable(
  spec: AvailabilitySpec,
  zone: string,
  ms: number,
): boolean {
  const wall = fromInstant(ms, zone);
  const open =
    spec.open === undefined ||
    spec.open.some((rule) => matches(rule, wall, zone, ms));
  const blocked = (spec.blocked ?? []).some((rule) =>
    matches(rule, wall, zone, ms),
  );
  return open && !blocked;
}

test("getIntervals agrees with a minute-by-minute scan on random specs", () => {
  const random = rng(20261118);
  for (let round = 0; round < 24; round += 1) {
    const zone = ZONES[round % ZONES.length] as string;
    const spec = randomSpec(random, zone);
    const availability = createAvailability(spec, { timeZone: zone });
    const from = plainDateTime(d(2026, 11, 16), plainTime(0, 0));
    const to = plainDateTime(d(2026, 11, 17), plainTime(0, 0));
    const startMs = toInstant(toZoned(from, zone));
    const endMs = toInstant(toZoned(to, zone));
    const pieces = availability.getIntervals(from, to);
    for (let ms = startMs; ms < endMs; ms += 5 * 60_000) {
      const piece = pieces.find((value) => value.start <= ms && ms < value.end);
      assert.equal(
        piece?.status === "available",
        naiveAvailable(spec, zone, ms),
        `round ${round} zone ${zone} at ${new Date(ms).toISOString()}`,
      );
    }
  }
});
