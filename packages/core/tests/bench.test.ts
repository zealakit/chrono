import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createAvailability,
  getMonthGrid,
  plainDate,
} from "../dist/foundation/index.js";

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] as number;
}

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
