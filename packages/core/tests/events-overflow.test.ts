import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  applyEventLimit,
  layoutMonthEvents,
  normalizeEvents,
} from "../dist/calendar/index.js";
import { plainDate } from "../dist/foundation/index.js";
import { monthLayout, runMonthFixture } from "./support/events.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) =>
  JSON.parse(readFileSync(join(here, "fixtures", "events", name), "utf8"));

test("golden fixture: month-overflow.json", () => {
  const fx = fixture("month-overflow.json");
  const { segments, more } = runMonthFixture(fx);
  for (const expected of fx.expected) {
    const segment = segments.find(
      (s) =>
        s.event.id === expected.id && s.startColumn === expected.startColumn,
    );
    assert.ok(segment, `missing ${expected.id}@${expected.startColumn}`);
    assert.equal(segment.hidden, expected.hidden);
  }
  assert.equal(more.length, 1);
  const overflowDay = more[0];
  assert.ok(overflowDay);
  assert.equal(overflowDay.dayKey, "2026-11-17");
  assert.equal(overflowDay.count, 2);
  assert.deepEqual(
    (overflowDay.events as { id: string }[]).map((e) => e.id).sort(),
    ["B", "C"],
  );
});

test("a multi-day piece hidden on some days is split", () => {
  const layout = monthLayout({ year: 2026, month: 11, weekStartsOn: 1 });
  const range = { start: plainDate(2026, 11, 1), end: plainDate(2026, 11, 30) };
  const events = normalizeEvents(
    [
      // A occupies columns 0-2 at lane 0.
      { id: "A", start: "2026-11-16", end: "2026-11-19", allDay: true },
      // B occupies columns 0-1 at lane 1.
      { id: "B", start: "2026-11-16", end: "2026-11-18", allDay: true },
      // C pushes column 1 (Nov 17) to three lanes.
      { id: "C", start: "2026-11-17", end: "2026-11-18", allDay: true },
    ],
    { visibleRange: range },
  );
  const segments = layoutMonthEvents(events, layout);
  const { segments: limited, more } = applyEventLimit(segments, 2, layout);

  // B spans columns 0 and 1: column 0 stays visible, column 1 overflows.
  const bVisible = limited.find(
    (s) => s.event.id === "B" && s.startColumn === 0,
  );
  const bHidden = limited.find(
    (s) => s.event.id === "B" && s.startColumn === 1,
  );
  assert.ok(bVisible, "B should keep a visible run on column 0");
  assert.ok(bHidden, "B should have a hidden run on column 1");
  assert.equal(bVisible.hidden, false);
  assert.equal(bHidden.hidden, true);

  const overflowDay = more.find((m) => m.dayKey === "2026-11-17");
  assert.ok(overflowDay);
  assert.equal(overflowDay.count, 2); // B (hidden run) and C
  assert.deepEqual(
    (overflowDay.events as { id: string }[]).map((e) => e.id).sort(),
    ["B", "C"],
  );
});

test("no limit leaves every piece visible", () => {
  const layout = monthLayout({ year: 2026, month: 11, weekStartsOn: 1 });
  const segments = layoutMonthEvents(
    normalizeEvents(
      [
        { id: "A", start: "2026-11-16", end: "2026-11-19", allDay: true },
        { id: "C", start: "2026-11-17", end: "2026-11-18", allDay: true },
        { id: "B", start: "2026-11-17T09:00", end: "2026-11-17T10:00" },
      ],
      {
        visibleRange: {
          start: plainDate(2026, 11, 1),
          end: plainDate(2026, 11, 30),
        },
      },
    ),
    layout,
  );
  const { segments: limited, more } = applyEventLimit(
    segments,
    undefined,
    layout,
  );
  assert.ok(limited.every((s) => !s.hidden));
  assert.equal(more.length, 0);
});
