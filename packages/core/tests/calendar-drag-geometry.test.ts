import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  autoScrollSpeed,
  editStep,
  matchShortcut,
  moveEvent,
  nudgeEvent,
  resizeEvent,
  snapTo,
  type EditValue,
  type GeometryOptions,
} from "../dist/calendar/index.js";
import {
  parseIsoDate,
  parseIsoDateTime,
  parseIsoTime,
  toIsoString,
} from "../dist/foundation/index.js";

type Case = {
  name: string;
  options: Partial<GeometryOptions>;
  from: [string, string, boolean];
  grab?: { dayOffset: number; minuteOffset: number };
  edge?: "start" | "end";
  target: { date: string; time?: string; allDayRow?: boolean };
  expected: [string, string, boolean] | null;
};
const fixture = JSON.parse(
  readFileSync(
    new URL("./fixtures/drag/geometry.json", import.meta.url),
    "utf8",
  ),
) as {
  cases: Case[];
  resize: Case[];
};
const defaults: GeometryOptions = {
  view: "time-grid",
  snap: 30,
  slot: 30,
  allowAllDayConversion: true,
  defaultTimedDuration: 60,
};
const value = ([s, e, allDay]: [string, string, boolean]): EditValue => ({
  start: parseIsoDateTime(s),
  end: parseIsoDateTime(e),
  allDay,
});
const show = (v: EditValue | null) =>
  v
    ? [
        toIsoString(v.start).slice(0, 16),
        toIsoString(v.end).slice(0, 16),
        v.allDay,
      ]
    : null;
const target = (t: Case["target"]) => ({
  date: parseIsoDate(t.date),
  time: t.time ? parseIsoTime(t.time) : undefined,
  allDayRow: t.allDayRow,
});

for (const c of fixture.cases) {
  test(`move: ${c.name}`, () => {
    const result = moveEvent(
      value(c.from),
      c.grab ?? { dayOffset: 0, minuteOffset: 0 },
      target(c.target),
      { ...defaults, ...c.options },
    );
    assert.deepEqual(show(result), c.expected);
  });
}
for (const c of fixture.resize) {
  test(`resize: ${c.name}`, () => {
    const result = resizeEvent(
      value(c.from),
      c.edge as "start" | "end",
      target(c.target),
      { ...defaults, ...c.options },
    );
    assert.deepEqual(show(result), c.expected);
  });
}

test("snapTo rounds to the nearest multiple and an exact tie up", () => {
  const q = 15 * 60;
  assert.equal(snapTo(7 * 60, q), 0);
  assert.equal(snapTo(8 * 60, q), q);
  assert.equal(snapTo(22 * 60, q), q);
  assert.equal(snapTo(30 * 60, 60 * 60), 3600);
});

test("auto-scroll speed by distance (plan 09 §13.2)", () => {
  assert.deepEqual(
    [0, 10, 20, 39, 40, 80, -5].map(autoScrollSpeed),
    [20, 15, 10, 1, 0, 0, 20],
  );
});

test("keyboard nudges: move, resize clamps, month steps", () => {
  const grid = { ...defaults, snap: 15 };
  const from = value(["2026-11-17T10:00", "2026-11-17T11:00", false]);
  const moved = nudgeEvent(from, "move", { days: 1, minutes: 15 }, grid);
  assert.deepEqual(show(moved), [
    "2026-11-18T10:15",
    "2026-11-18T11:15",
    false,
  ]);
  const squeezed = nudgeEvent(
    from,
    "resize-end",
    { days: 0, minutes: -120 },
    grid,
  );
  assert.deepEqual(show(squeezed), [
    "2026-11-17T10:00",
    "2026-11-17T10:15",
    false,
  ]);
  const start = nudgeEvent(
    from,
    "resize-start",
    { days: 0, minutes: 120 },
    grid,
  );
  assert.deepEqual(show(start), [
    "2026-11-17T10:45",
    "2026-11-17T11:00",
    false,
  ]);
  assert.deepEqual(
    editStep("move", "ArrowDown", { timeGrid: true, snap: 15 }),
    { type: "step", days: 0, minutes: 15 },
  );
  assert.deepEqual(
    editStep("move", "ArrowRight", { timeGrid: true, snap: 15 }),
    { type: "step", days: 1, minutes: 0 },
  );
  assert.deepEqual(
    editStep("move", "ArrowDown", { timeGrid: false, snap: 15 }),
    { type: "step", days: 7, minutes: 0 },
  );
  assert.deepEqual(
    editStep("resize-end", "ArrowRight", { timeGrid: true, snap: 15 }),
    { type: "step", days: 0, minutes: 0 },
  );
  assert.deepEqual(
    editStep("move", "ArrowRight", { timeGrid: false, snap: 15, rtl: true }),
    { type: "step", days: -1, minutes: 0 },
  );
  assert.deepEqual(editStep("move", "Enter", { timeGrid: true, snap: 15 }), {
    type: "drop",
  });
  assert.deepEqual(editStep("move", "Escape", { timeGrid: true, snap: 15 }), {
    type: "cancel",
  });
  assert.equal(editStep("move", "x", { timeGrid: true, snap: 15 }), null);
});

test("shortcuts: case-insensitive, R vs Shift+R, ignored with Ctrl/Meta/Alt, configurable", () => {
  const none = { shift: false, ctrl: false, meta: false };
  const defaultsOn = { move: "m", resizeEnd: "r", resizeStart: "R" };
  assert.equal(matchShortcut("m", none, defaultsOn), "move");
  assert.equal(matchShortcut("M", none, defaultsOn), "move");
  assert.equal(matchShortcut("r", none, defaultsOn), "resize-end");
  assert.equal(
    matchShortcut("R", { ...none, shift: true }, defaultsOn),
    "resize-start",
  );
  assert.equal(matchShortcut("m", { ...none, ctrl: true }, defaultsOn), null);
  assert.equal(matchShortcut("m", { ...none, alt: true }, defaultsOn), null);
  assert.equal(matchShortcut("m", none, false), null);
  assert.equal(matchShortcut("x", none, { ...defaultsOn, move: "x" }), "move");
});
