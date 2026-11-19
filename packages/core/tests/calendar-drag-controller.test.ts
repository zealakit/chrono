import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createCalendarController,
  type CalendarOptions,
  type EventChangeProposal,
} from "../dist/calendar/index.js";
import { toIsoString } from "../dist/foundation/index.js";

const NOW = Date.UTC(2026, 10, 17, 12);
const base: CalendarOptions = {
  id: "cal",
  locale: "en-US",
  timeZone: "UTC",
  now: NOW,
  weekStartsOn: 1,
  editable: true,
  defaultView: "day",
  snapDuration: 15,
};
const events = [
  { id: "A", start: "2026-11-17T10:00", end: "2026-11-17T11:00" },
];
const wait = (ms = 5) => new Promise((r) => setTimeout(r, ms));
const key = (c: { getState(): { events: unknown } }) =>
  (c.getState().events as { key: string }[])[0]?.key as string;
const iso = (v: unknown) => toIsoString(v as never).slice(0, 16);

function make(extra: Partial<CalendarOptions> = {}) {
  const proposals: EventChangeProposal[] = [];
  const controller = createCalendarController({
    ...base,
    events,
    onEventChange: (p: EventChangeProposal) => {
      proposals.push(p);
    },
    ...extra,
  });
  return { controller, proposals };
}
const hit = (time: string) => ({ cellKey: `2026-11-17T${time}:00` });

test("move: start, update and drop propose a snapped change", () => {
  const { controller, proposals } = make();
  assert.equal(controller.startMove(key(controller)), true);
  assert.equal(controller.getState().drag?.kind, "move");
  controller.updateDrag(hit("14:07") as never);
  const drag = controller.getState().drag;
  assert.equal(drag?.valid, true);
  controller.dropDrag();
  assert.equal(proposals.length, 1);
  assert.equal(proposals[0]?.kind, "move");
  assert.equal(proposals[0]?.source, "pointer");
  assert.equal(controller.getState().drag, null);
  assert.ok(iso(proposals[0]?.to.start));
});

test("cancel never proposes", () => {
  const { controller, proposals } = make();
  controller.startMove(key(controller));
  controller.updateDrag(hit("14:07") as never);
  controller.cancelDrag();
  assert.equal(proposals.length, 0);
  assert.equal(controller.getState().drag, null);
});

test("drop without moving proposes nothing", () => {
  const { controller, proposals } = make();
  controller.startMove(key(controller));
  controller.dropDrag();
  assert.equal(proposals.length, 0);
});

test("validateEventChange blocks the drop", () => {
  const { controller, proposals } = make({ validateEventChange: () => false });
  controller.startMove(key(controller));
  controller.updateDrag(hit("14:07") as never);
  assert.equal(controller.getState().drag?.valid, false);
  controller.dropDrag();
  assert.equal(proposals.length, 0);
});

test("editable false and per-event editable false refuse to start", () => {
  const off = make({ editable: false });
  assert.equal(off.controller.startMove(key(off.controller)), false);
  const per = createCalendarController({
    ...base,
    events: [{ ...events[0]!, movable: false }],
  });
  assert.equal(per.startMove(key(per)), false);
  assert.equal(per.startResize(key(per), "end"), true);
});

test("1,000 identical updateDrag calls notify once", () => {
  const { controller } = make();
  controller.startMove(key(controller));
  controller.updateDrag(hit("14:07") as never);
  let count = 0;
  controller.subscribe(() => {
    count += 1;
  });
  for (let i = 0; i < 1000; i += 1)
    controller.updateDrag(hit("14:07") as never);
  assert.equal(count, 0);
  controller.updateDrag(hit("15:00") as never);
  assert.equal(count, 1);
});

test("pending: an event update that matches resolves the change", async () => {
  const { controller, proposals } = make();
  controller.startMove(key(controller));
  controller.updateDrag(hit("14:00") as never);
  controller.dropDrag();
  assert.equal(controller.getState().pending.length, 1);
  const p = proposals[0]!;
  controller.setOptions({
    events: [{ ...events[0]!, start: iso(p.to.start), end: iso(p.to.end) }],
  });
  assert.equal(controller.getState().pending.length, 0);
});

test("pending: false and a rejected promise reject the change", async () => {
  for (const result of [() => false, () => Promise.reject(new Error("no"))]) {
    const originalError = console.error;
    console.error = () => {};
    const { controller } = make({ onEventChange: result as never });
    controller.startMove(key(controller));
    controller.updateDrag(hit("14:00") as never);
    controller.dropDrag();
    await wait();
    console.error = originalError;
    assert.equal(controller.getState().pending.length, 0);
  }
});

test("pending: a promise resolving true keeps it pending until events change; timeout drops it", async () => {
  const { controller } = make({
    onEventChange: () => Promise.resolve(true),
    pendingTimeout: 20,
  });
  controller.startMove(key(controller));
  controller.updateDrag(hit("14:00") as never);
  controller.dropDrag();
  await wait(5);
  assert.equal(controller.getState().pending.length, 1);
  await wait(40);
  assert.equal(controller.getState().pending.length, 0);
});

test("event removed mid-drag cancels the drag (M14)", () => {
  const { controller } = make();
  controller.startMove(key(controller));
  controller.setOptions({ events: [] });
  assert.equal(controller.getState().drag, null);
});

test("keyboard: M, arrows, Enter proposes with source keyboard", () => {
  const { controller, proposals } = make();
  const k = key(controller);
  assert.equal(controller.startMove(k, "keyboard"), true);
  controller.updateDrag({ ...hit("10:15") } as never);
  controller.dropDrag();
  assert.equal(proposals[0]?.source, "keyboard");
});

test("attributes: editable, dragging, shortcuts and handle", () => {
  const { controller } = make();
  const seg = (controller.getState().events as never[])[0]!;
  const attrs = controller.getEventAttributes(seg) as Record<string, unknown>;
  assert.equal(attrs["data-editable"], true);
  assert.ok(attrs["aria-keyshortcuts"]);
  controller.startMove(key(controller));
  const during = controller.getEventAttributes(seg) as Record<string, unknown>;
  assert.equal(during["data-dragging"], true);
  assert.equal(controller.getRootAttributes()["data-dragging"], true);
  const handle = controller.getResizeHandleAttributes(seg, "end") as Record<
    string,
    unknown
  >;
  assert.equal(handle["data-chrono-resize"], "end");
  const off = createCalendarController({
    ...base,
    events,
    keyboardShortcuts: false,
  });
  const offSeg = (off.getState().events as never[])[0]!;
  assert.equal(
    (off.getEventAttributes(offSeg) as Record<string, unknown>)[
      "aria-keyshortcuts"
    ],
    undefined,
  );
});

test("invariants: 1,000 seeded drags keep start < end and a positive duration", () => {
  let seed = 7;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  for (let i = 0; i < 1000; i += 1) {
    const proposals: EventChangeProposal[] = [];
    const c = createCalendarController({
      ...base,
      events,
      onEventChange: (p: EventChangeProposal) => {
        proposals.push(p);
      },
    });
    const k = key(c);
    const edge = rand() < 0.5 ? "start" : "end";
    if (rand() < 0.5) c.startMove(k);
    else c.startResize(k, edge);
    const pad = (n: number) => String(n).padStart(2, "0");
    c.updateDrag({
      cellKey: `2026-11-${15 + Math.floor(rand() * 5)}T${pad(Math.floor(rand() * 24))}:${pad(Math.floor(rand() * 60))}:00`,
    } as never);
    c.dropDrag();
    for (const p of proposals) assert.ok(iso(p.to.start) < iso(p.to.end));
  }
});
