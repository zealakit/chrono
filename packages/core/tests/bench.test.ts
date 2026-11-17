import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createCalendarController,
  layoutMonthEvents,
  layoutTimeGridEvents,
  normalizeEvents,
} from "../dist/calendar/index.js";
import {
  addDays,
  createAvailability,
  getMonthGrid,
  plainDate,
} from "../dist/foundation/index.js";
import { monthLayout } from "./support/events.ts";

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] as number;
}

const pad = (n: number) => String(n).padStart(2, "0");

// Reported only (plan 02 §7): never fails on timing.
test("getMonthGrid median time over 1,000 runs", (t) => {
  for (let warm = 0; warm < 200; warm += 1)
    getMonthGrid(2026, 1 + (warm % 12), { weekStartsOn: 1, fixedWeeks: true });
  const times: number[] = [];
  for (let run = 0; run < 1000; run += 1) {
    const start = performance.now();
    getMonthGrid(2026, 1 + (run % 12), { weekStartsOn: 1, fixedWeeks: true });
    times.push(performance.now() - start);
  }
  const ms = median(times);
  t.diagnostic(`getMonthGrid median: ${ms.toFixed(4)} ms (target < 1 ms)`);
  assert.ok(ms >= 0);
});

test("createAvailability lookups", (t) => {
  const availability = createAvailability({
    mode: "blocked",
    weekdays: [6, 7],
    ranges: Array.from({ length: 200 }, (_, index) => ({
      start: plainDate(2026, 1 + (index % 12), 1 + (index % 20)),
      end: plainDate(2026, 1 + (index % 12), 5 + (index % 20)),
    })),
  });
  const probe = plainDate(2026, 6, 15);
  const start = performance.now();
  const runs = 100000;
  for (let run = 0; run < runs; run += 1) availability.isAvailable(probe);
  const perCall = ((performance.now() - start) / runs) * 1000;
  t.diagnostic(`isAvailable: ${perCall.toFixed(3)} µs per call`);
  assert.ok(perCall >= 0);
});

test("calendar controller update (next month)", (t) => {
  const controller = createCalendarController({
    locale: "en-US",
    timeZone: "UTC",
    now: Date.UTC(2026, 10, 17),
    weekStartsOn: 1,
  });
  for (let warm = 0; warm < 50; warm += 1) controller.next();
  const times: number[] = [];
  for (let run = 0; run < 200; run += 1) {
    const start = performance.now();
    controller.next();
    times.push(performance.now() - start);
  }
  const ms = median(times);
  t.diagnostic(`calendar next() median: ${ms.toFixed(4)} ms (target < 2 ms)`);
  assert.ok(ms >= 0);
});

// Reported only (plan 05 §5): never fails on timing.
test("layout 1,000 events in a week time grid", (t) => {
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(plainDate(2026, 11, 16), i);
    return { date, key: `${date.year}-${pad(date.month)}-${pad(date.day)}` };
  });
  const events = Array.from({ length: 1000 }, (_, i) => {
    const day = 16 + (i % 7);
    const hour = (i * 7) % 23;
    return {
      id: `e${i}`,
      start: `2026-11-${pad(day)}T${pad(hour)}:00`,
      end: `2026-11-${pad(day)}T${pad(hour + 1)}:00`,
    };
  });
  const normalized = normalizeEvents(events, {
    visibleRange: {
      start: plainDate(2026, 11, 16),
      end: plainDate(2026, 11, 22),
    },
  });
  for (let warm = 0; warm < 10; warm += 1)
    layoutTimeGridEvents(normalized, days);
  const times: number[] = [];
  for (let run = 0; run < 50; run += 1) {
    const start = performance.now();
    layoutTimeGridEvents(normalized, days);
    times.push(performance.now() - start);
  }
  t.diagnostic(
    `layoutTimeGridEvents (1,000 events): ${median(times).toFixed(2)} ms (target < 16 ms)`,
  );
  assert.ok(true);
});

test("layout 300 events in a month", (t) => {
  const layout = monthLayout({ year: 2026, month: 11, weekStartsOn: 1 });
  const events = Array.from({ length: 300 }, (_, i) => {
    const day = 1 + (i % 30);
    const hour = (i * 3) % 23;
    return {
      id: `e${i}`,
      start: `2026-11-${pad(day)}T${pad(hour)}:00`,
      end: `2026-11-${pad(day)}T${pad(hour + 1)}:00`,
    };
  });
  const normalized = normalizeEvents(events, {
    visibleRange: {
      start: plainDate(2026, 11, 1),
      end: plainDate(2026, 11, 30),
    },
  });
  for (let warm = 0; warm < 10; warm += 1)
    layoutMonthEvents(normalized, layout);
  const times: number[] = [];
  for (let run = 0; run < 50; run += 1) {
    const start = performance.now();
    layoutMonthEvents(normalized, layout);
    times.push(performance.now() - start);
  }
  t.diagnostic(
    `layoutMonthEvents (300 events): ${median(times).toFixed(2)} ms`,
  );
  assert.ok(true);
});
