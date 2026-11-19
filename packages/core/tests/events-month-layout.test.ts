import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  compareMonthSegments,
  layoutMonthEvents,
  normalizeEvents,
  type MonthSegment,
} from "../dist/calendar/index.js";
import { plainDate } from "../dist/foundation/index.js";
import { monthLayout, runMonthFixture } from "./support/events.ts";
import { mulberry32, packMonthLanes } from "./support/oracle.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) =>
  JSON.parse(readFileSync(join(here, "fixtures", "events", name), "utf8"));

type Expected = {
  id: string;
  startColumn: number;
  days?: number;
  lane?: number;
  allDay?: boolean;
  hidden?: boolean;
  continuesBefore?: boolean;
  continuesAfter?: boolean;
};

function find(segments: MonthSegment[], expected: Expected): MonthSegment {
  const segment = segments.find(
    (s) => s.event.id === expected.id && s.startColumn === expected.startColumn,
  );
  assert.ok(segment, `missing segment ${expected.id}@${expected.startColumn}`);
  return segment;
}

for (const name of ["month-lanes.json", "month-week-splits.json"]) {
  test(`golden fixture: ${name}`, () => {
    const fx = fixture(name);
    const { segments } = runMonthFixture(fx);
    for (const expected of fx.expected as Expected[]) {
      const segment = find(segments, expected);
      if (expected.days !== undefined)
        assert.equal(segment.days, expected.days);
      if (expected.lane !== undefined)
        assert.equal(segment.lane, expected.lane);
      if (expected.allDay !== undefined)
        assert.equal(segment.allDay, expected.allDay);
      if (expected.continuesBefore !== undefined)
        assert.equal(segment.continuesBefore, expected.continuesBefore);
      if (expected.continuesAfter !== undefined)
        assert.equal(segment.continuesAfter, expected.continuesAfter);
    }
  });
}

test("a timed event crossing midnight becomes one piece per day", () => {
  const layout = monthLayout({ year: 2026, month: 11, weekStartsOn: 1 });
  const events = normalizeEvents(
    [{ id: "x", start: "2026-11-16T22:00", end: "2026-11-17T02:00" }],
    {
      visibleRange: {
        start: plainDate(2026, 11, 1),
        end: plainDate(2026, 11, 30),
      },
    },
  );
  const segments = layoutMonthEvents(events, layout);
  assert.equal(segments.length, 2);
  const day16 = segments.find((s) => s.key.endsWith("2026-11-16"));
  const day17 = segments.find((s) => s.key.endsWith("2026-11-17"));
  assert.ok(day16);
  assert.ok(day17);
  assert.equal(day16.days, 1);
  assert.equal(day16.continuesBefore, false);
  assert.equal(day16.continuesAfter, true);
  assert.equal(day17.days, 1);
  assert.equal(day17.continuesBefore, true);
  assert.equal(day17.continuesAfter, false);
});

test("a timed event ending exactly at midnight stays on one day", () => {
  const layout = monthLayout({ year: 2026, month: 11, weekStartsOn: 1 });
  const events = normalizeEvents(
    [{ id: "x", start: "2026-11-16T22:00", end: "2026-11-17T00:00" }],
    {
      visibleRange: {
        start: plainDate(2026, 11, 1),
        end: plainDate(2026, 11, 30),
      },
    },
  );
  const segments = layoutMonthEvents(events, layout);
  assert.equal(segments.length, 1);
});

test("an adjacent day in a multi-month layout renders only in its own month", () => {
  const layout = monthLayout({
    year: 2026,
    month: 11,
    count: 2,
    weekStartsOn: 1,
  });
  const events = normalizeEvents(
    [{ id: "x", start: "2026-12-01", end: "2026-12-02", allDay: true }],
    {
      visibleRange: {
        start: plainDate(2026, 11, 1),
        end: plainDate(2026, 12, 31),
      },
    },
  );
  const segments = layoutMonthEvents(events, layout);
  assert.equal(segments.length, 1);
  assert.equal(segments[0]?.month, 1); // December grid, not November's trailing day
});

test("month lane packing matches the oracle on seeded random sets", () => {
  const rand = mulberry32(0x5eed);
  const layout = monthLayout({ year: 2026, month: 11, weekStartsOn: 1 });
  const range = { start: plainDate(2026, 11, 1), end: plainDate(2026, 11, 30) };
  const pad = (n: number) => String(n).padStart(2, "0");
  for (let set = 0; set < 300; set += 1) {
    const events: {
      id: string;
      start: string;
      end: string;
      allDay?: boolean;
    }[] = [];
    const n = 2 + Math.floor(rand() * 12);
    for (let i = 0; i < n; i += 1) {
      const day = 1 + Math.floor(rand() * 25);
      if (rand() < 0.5) {
        const span = 1 + Math.floor(rand() * 4);
        events.push({
          id: `e${i}`,
          start: `2026-11-${pad(day)}`,
          end: `2026-11-${pad(day + span)}`,
          allDay: true,
        });
      } else {
        const hour = Math.floor(rand() * 23);
        events.push({
          id: `e${i}`,
          start: `2026-11-${pad(day)}T${pad(hour)}:00`,
          end: `2026-11-${pad(day)}T${pad(hour + 1)}:00`,
        });
      }
    }
    const segments = layoutMonthEvents(
      normalizeEvents(events, { visibleRange: range }),
      layout,
    );
    const groups = new Map<string, MonthSegment[]>();
    for (const segment of segments) {
      const key = `${segment.month}:${segment.week}`;
      const list = groups.get(key) ?? [];
      groups.set(key, list);
      list.push(segment);
    }
    for (const group of groups.values()) {
      group.sort(compareMonthSegments);
      const lanes = packMonthLanes(
        group.map((s) => ({ start: s.startColumn, days: s.days })),
      );
      group.forEach((s, i) => {
        assert.equal(s.lane, lanes[i]);
      });
      for (let a = 0; a < group.length; a += 1) {
        for (let b = a + 1; b < group.length; b += 1) {
          if (group[a]?.lane === group[b]?.lane) {
            const aEnd =
              (group[a] as MonthSegment).startColumn +
              (group[a] as MonthSegment).days;
            const bEnd =
              (group[b] as MonthSegment).startColumn +
              (group[b] as MonthSegment).days;
            assert.ok(
              aEnd <= (group[b] as MonthSegment).startColumn ||
                bEnd <= (group[a] as MonthSegment).startColumn,
              "two pieces overlap in the same lane",
            );
          }
        }
      }
    }
  }
});
