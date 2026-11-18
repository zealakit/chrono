import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildResourceTree,
  buildTimelineAxis,
  clampWindow,
  createCalendarController,
  layoutTimeline,
  resourceCellKey,
  resourceViews,
  zoomTarget,
  type CalendarOptions,
} from "../dist/calendar/index.js";
import { plainDate } from "../dist/foundation/index.js";

const NOW = Date.UTC(2026, 10, 17, 12);
const base: CalendarOptions = {
  id: "cal",
  locale: "en-US",
  timeZone: "UTC",
  now: NOW,
  weekStartsOn: 1,
  views: resourceViews,
};
const RESOURCES = [
  { id: "bld", name: "Building" },
  { id: "A", parentId: "bld", name: "Room A" },
  { id: "B", parentId: "bld", name: "Room B" },
  { id: "C", name: "Van" },
];
const EVENTS = [
  {
    id: 1,
    start: "2026-11-17T09:00",
    end: "2026-11-17T10:30",
    resourceId: "A",
  },
  {
    id: 2,
    start: "2026-11-17T10:00",
    end: "2026-11-17T11:00",
    resourceId: ["A", "B"],
  },
  {
    id: 3,
    start: "2026-11-17T09:30",
    end: "2026-11-17T09:45",
    resourceId: "A",
  },
  {
    id: 4,
    start: "2026-11-17T12:00",
    end: "2026-11-17T13:00",
    resourceId: "C",
  },
  { id: 5, start: "2026-11-17T12:00", end: "2026-11-17T13:00" },
];
const make = (extra: Partial<CalendarOptions> = {}) =>
  createCalendarController({
    ...base,
    resources: RESOURCES,
    events: EVENTS,
    ...extra,
  } as never);
const layout = (c: ReturnType<typeof make>) => c.getState().resources as any;

test("tree: parentId nesting, collapse hides descendants, bad data is tolerated", () => {
  const tree = buildResourceTree(RESOURCES);
  assert.deepEqual(
    tree.rows.map((r) => [r.key, r.level, r.group]),
    [
      ["bld", 0, true],
      ["A", 1, false],
      ["B", 1, false],
      ["C", 0, false],
    ],
  );
  const collapsed = buildResourceTree(RESOURCES, ["bld"]);
  assert.deepEqual(
    collapsed.rows.map((r) => r.key),
    ["bld", "C"],
  );
  assert.equal(collapsed.rows[0]?.expanded, false);
  const warn = console.warn;
  console.warn = () => {};
  const messy = buildResourceTree([
    { id: "x", parentId: "y" },
    { id: "y", parentId: "x" },
    { id: "z", parentId: "missing" },
    { id: "z" },
  ]);
  console.warn = warn;
  assert.equal(messy.rows.length, 3);
  assert.ok(messy.rows.every((r) => r.level <= 1));
});

test("resource day: columns per leaf, group header spans, per-column layout", () => {
  const c = make({
    defaultView: "resourceDay",
    defaultDate: plainDate(2026, 11, 17),
  } as never);
  const l = layout(c);
  assert.equal(l.kind, "resource-time-grid");
  assert.deepEqual(
    l.columns.map((x: any) => x.resourceKey),
    ["A", "B", "C"],
  );
  assert.deepEqual(
    l.groups.map((g: any) => [g.resourceKey, g.colSpan]),
    [["bld", 2]],
  );
  const inA = l.pieces
    .filter((p: any) => p.resourceKey === "A")
    .map((p: any) => p.event.id)
    .sort();
  assert.deepEqual(inA, [1, 2, 3]);
  assert.deepEqual(
    l.pieces
      .filter((p: any) => p.resourceKey === "B")
      .map((p: any) => p.event.id),
    [2],
  );
  // Overlapping events in one column share columns; a different column is unaffected.
  const two = l.pieces.find(
    (p: any) => p.resourceKey === "A" && p.event.id === 2,
  );
  assert.ok(two.columns >= 2);
  assert.equal(l.pieces.find((p: any) => p.event.id === 4).columns, 1);
  assert.ok(
    !l.pieces.some((p: any) => p.event.id === 5),
    "events without a resource are not shown",
  );
});

test("resource week: resource-first and date-first column order", () => {
  const first = layout(
    make({
      defaultView: "resourceWeek",
      defaultDate: plainDate(2026, 11, 17),
    } as never),
  );
  assert.equal(first.columns.length, 3 * 7);
  assert.deepEqual(
    first.columns.slice(0, 2).map((x: any) => x.key),
    ["A@2026-11-16", "A@2026-11-17"],
  );
  assert.equal(first.groups[0].colSpan, 2 * 7);
  const date = layout(
    make({
      defaultView: "resourceWeek",
      resourceGrouping: "date-first",
      defaultDate: plainDate(2026, 11, 17),
    } as never),
  );
  assert.deepEqual(
    date.columns.slice(0, 4).map((x: any) => x.key),
    ["A@2026-11-16", "B@2026-11-16", "C@2026-11-16", "A@2026-11-17"],
  );
});

test("timeline axis: header spans for day, week and a 3-day custom axis", () => {
  const day = buildTimelineAxis(
    plainDate(2026, 11, 17),
    1,
    { minutes: 60 },
    ["day", "hour"],
    "en-US",
  );
  assert.equal(day.slots.length, 24);
  assert.deepEqual(
    day.headerRows.map((r) => [r.unit, r.cells.length, r.cells[0]?.span]),
    [
      ["day", 1, 24],
      ["hour", 24, 1],
    ],
  );
  const week = buildTimelineAxis(
    plainDate(2026, 11, 16),
    7,
    { days: 1 },
    ["week", "day"],
    "en-US",
  );
  assert.deepEqual(
    week.headerRows.map((r) => [r.cells.length, r.cells[0]?.span]),
    [
      [1, 7],
      [7, 1],
    ],
  );
  const custom = buildTimelineAxis(
    plainDate(2026, 11, 16),
    3,
    { minutes: 30 },
    ["day", "hour"],
    "en-US",
  );
  assert.equal(custom.slots.length, 144);
  assert.deepEqual(
    custom.headerRows[0]?.cells.map((x) => x.span),
    [48, 48, 48],
  );
  assert.equal(custom.headerRows[1]?.cells.length, 72);
  assert.ok(custom.headerRows[1]?.cells.every((x) => x.span === 2));
});

test("timeline: left/width fractions, lanes, group rows hold no events", () => {
  const c = make({
    defaultView: "timelineDay",
    defaultDate: plainDate(2026, 11, 17),
  } as never);
  const l = layout(c);
  assert.equal(l.kind, "timeline");
  assert.equal(l.grouped, true);
  const one = l.pieces.find((p: any) => p.event.id === 1);
  assert.equal(one.left, 9 / 24);
  assert.equal(one.width, 1.5 / 24);
  const lanesA = new Map(
    l.pieces
      .filter((p: any) => p.rowKey === "A")
      .map((p: any) => [p.event.id, p.lane]),
  );
  assert.equal(lanesA.get(1), 0);
  assert.equal(lanesA.get(3), 1, "overlapping event takes the next lane");
  assert.equal(
    lanesA.get(2),
    1,
    "first fit reuses the lane that ended at 09:45",
  );
  assert.equal(l.rows.find((r: any) => r.key === "A").lanes, 2);
  assert.equal(l.rows.find((r: any) => r.key === "bld").lanes, 1);
  assert.ok(!l.pieces.some((p: any) => p.rowKey === "bld"));
});

test("timeline: touching events share a lane; clipping sets continuation flags", () => {
  const c = make({
    defaultView: "timelineDay",
    defaultDate: plainDate(2026, 11, 17),
    events: [
      {
        id: "a",
        start: "2026-11-17T09:00",
        end: "2026-11-17T10:00",
        resourceId: "C",
      },
      {
        id: "b",
        start: "2026-11-17T10:00",
        end: "2026-11-17T11:00",
        resourceId: "C",
      },
      {
        id: "long",
        start: "2026-11-16T20:00",
        end: "2026-11-17T02:00",
        resourceId: "C",
      },
    ],
  } as never);
  const pieces = layout(c).pieces;
  assert.equal(
    pieces.find((p: any) => p.event.id === "a").lane,
    pieces.find((p: any) => p.event.id === "b").lane,
  );
  const long = pieces.find((p: any) => p.event.id === "long");
  assert.equal(long.left, 0);
  assert.equal(long.continuesBefore, true);
  assert.equal(long.width, 2 / 24);
});

test("collapse: toggleResource hides a group and its events, controllable and uncontrolled", () => {
  const changes: unknown[] = [];
  const c = make({
    defaultView: "timelineDay",
    defaultDate: plainDate(2026, 11, 17),
    onCollapsedResourceIdsChange: (ids: unknown) => changes.push(ids),
  } as never);
  assert.equal(layout(c).rows.length, 4);
  c.toggleResource("bld");
  assert.deepEqual(
    layout(c).rows.map((r: any) => r.key),
    ["bld", "C"],
  );
  assert.ok(!layout(c).pieces.some((p: any) => p.rowKey === "A"));
  assert.deepEqual(changes, [["bld"]]);
  c.toggleResource("bld");
  assert.equal(layout(c).rows.length, 4);
  const controlled = make({
    defaultView: "timelineDay",
    collapsedResourceIds: ["bld"],
  } as never);
  controlled.toggleResource("bld");
  assert.deepEqual(
    layout(controlled).rows.map((r: any) => r.key),
    ["bld", "C"],
  );
});

test("windowing: a window equals the full layout restricted to it; counts and offsets", () => {
  const view = {
    defaultView: "timelineDay",
    defaultDate: plainDate(2026, 11, 17),
  } as Partial<CalendarOptions>;
  const full = layout(make(view));
  const win = layout(
    make({
      ...view,
      resourceWindow: { start: 1, end: 3 },
      slotWindow: { start: 8, end: 12 },
    } as never),
  );
  assert.deepEqual(
    win.rows.map((r: any) => r.key),
    ["A", "B"],
  );
  assert.deepEqual(
    win.pieces.map((p: any) => p.key).sort(),
    full.pieces
      .filter((p: any) => ["A", "B"].includes(p.rowKey))
      .map((p: any) => p.key)
      .sort(),
  );
  assert.equal(win.axis.slots.length, 4);
  assert.deepEqual(win.window, {
    totalRows: 4,
    totalColumns: 24,
    rowOffset: 1,
    columnOffset: 8,
  });
  assert.deepEqual(clampWindow(5, { start: -2, end: 99 }), {
    start: 0,
    end: 5,
  });
});

test("zoom: moves along zoomLevels and is a no-op at the ends", () => {
  assert.equal(
    zoomTarget(["timelineDay", "timelineWeek"], "timelineDay", 1),
    "timelineWeek",
  );
  assert.equal(
    zoomTarget(["timelineDay", "timelineWeek"], "timelineDay", -1),
    undefined,
  );
  const c = make({
    defaultView: "timelineWeek",
    zoomLevels: ["timelineDay", "timelineWeek", "timelineMonth"],
    defaultDate: plainDate(2026, 11, 17),
  } as never);
  c.zoomIn();
  assert.equal(c.getState().view, "timelineDay");
  c.zoomIn();
  assert.equal(c.getState().view, "timelineDay");
  c.zoomOut();
  c.zoomOut();
  assert.equal(c.getState().view, "timelineMonth");
});

test("attributes: roles, levels, expanded, lanes, keys with encoded ids", () => {
  const c = make({
    defaultView: "timelineDay",
    defaultDate: plainDate(2026, 11, 17),
  } as never);
  const l = layout(c);
  const root = c.getTimelineAttributes();
  assert.equal(root.role, "treegrid");
  assert.equal(root["aria-rowcount"], 4 + 2);
  const group = c.getTimelineRowAttributes(l.rows[0]);
  assert.equal(group["aria-expanded"], "true");
  assert.equal(group["aria-level"], 1);
  const row = c.getTimelineRowAttributes(l.rows[1]);
  assert.equal(row["aria-level"], 2);
  assert.equal(row["--chrono-row-lanes"], 2);
  assert.equal(row["aria-rowindex"], 2 + 2);
  assert.equal(c.getTimelineRowHeaderAttributes(l.rows[1])["aria-label"], "A");
  assert.equal(
    resourceCellKey("2026-11-17T09:00", 'room a@"é'),
    "2026-11-17T09:00@room%20a%40%22%C3%A9",
  );
  const piece = c.getResourcePieceAttributes(l.pieces[0]);
  assert.equal(piece["data-resource-id"], l.pieces[0].resourceKey);
  assert.equal(typeof piece["--chrono-event-left"], "number");
  const header = c.getTimelineHeaderCellAttributes(
    l.axis.headerRows[1].cells[0],
  );
  assert.equal(header["data-header-level"], "hour");
  assert.equal(c.getTimelineAttributes().role, "treegrid");
  const flat = make({
    defaultView: "timelineDay",
    resources: [{ id: "x" }],
  } as never);
  assert.equal(flat.getTimelineAttributes().role, "grid");
});

test("labels: getResourceLabel and the id fallback", () => {
  const c = make({
    defaultView: "resourceDay",
    getResourceLabel: (r: any) => r.name,
  } as never);
  assert.equal(layout(c).columns[0].label, "Room A");
  assert.equal(
    layout(make({ defaultView: "resourceDay" } as never)).columns[0].label,
    "A",
  );
});

test("base views are unchanged and state.resources is null outside resource views", () => {
  const c = make({ defaultView: "week" } as never);
  assert.equal(c.getState().resources, null);
  assert.ok(layoutTimeline);
});

test("invariants: 300 seeded datasets keep lanes disjoint and pieces unique per resource", () => {
  let seed = 11;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const pad = (n: number) => String(n).padStart(2, "0");
  for (let round = 0; round < 300; round += 1) {
    const resources = Array.from(
      { length: 1 + Math.floor(rand() * 6) },
      (_, i) => ({
        id: `r${i}`,
        parentId:
          i > 0 && rand() < 0.3 ? `r${Math.floor(rand() * i)}` : undefined,
      }),
    );
    const events = Array.from(
      { length: 1 + Math.floor(rand() * 20) },
      (_, i) => {
        const s = Math.floor(rand() * 23 * 60);
        const e = Math.min(24 * 60, s + 15 + Math.floor(rand() * 240));
        const ids = [`r${Math.floor(rand() * resources.length)}`];
        if (rand() < 0.3) ids.push(`r${Math.floor(rand() * resources.length)}`);
        return {
          id: i,
          start: `2026-11-17T${pad(Math.floor(s / 60))}:${pad(s % 60)}`,
          end:
            e === 24 * 60
              ? "2026-11-18T00:00"
              : `2026-11-17T${pad(Math.floor(e / 60))}:${pad(e % 60)}`,
          resourceId: ids,
        };
      },
    );
    const c = createCalendarController({
      ...base,
      defaultView: "timelineDay",
      defaultDate: plainDate(2026, 11, 17),
      resources,
      events,
    } as never);
    const l = layout(c);
    const seen = new Set<string>();
    for (const row of l.rows) {
      const inRow = l.pieces.filter((p: any) => p.rowKey === row.key);
      for (const p of inRow) {
        assert.ok(!seen.has(p.key));
        seen.add(p.key);
        assert.ok(p.lane < row.lanes);
        for (const q of inRow) {
          if (p !== q && p.lane === q.lane) {
            assert.ok(
              p.left + p.width <= q.left || q.left + q.width <= p.left,
              "same-lane pieces must not overlap",
            );
          }
        }
      }
    }
    for (const event of events) {
      for (const id of event.resourceId) {
        const row = l.rows.find((r: any) => r.key === id);
        const count = l.pieces.filter(
          (p: any) => p.event.id === event.id && p.rowKey === id,
        ).length;
        assert.equal(count, row && !row.group ? 1 : 0);
      }
    }
  }
});
