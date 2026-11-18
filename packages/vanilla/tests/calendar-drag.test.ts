import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import type { CalendarOptions } from "../dist/calendar/index.js";
import { resetDom } from "./support/dom.ts";
import { type Mounted, mountCalendar } from "./support/reference.ts";

const base: CalendarOptions = {
  id: "cal",
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 12),
  weekStartsOn: 1,
  editable: true,
  events: [{ id: "A", start: "2026-11-17T09:00", end: "2026-11-17T10:00" }],
};
const live: Mounted[] = [];
beforeEach(resetDom);
afterEach(() => {
  for (const mounted of live.splice(0)) mounted.calendar.destroy();
});
const open = (options: CalendarOptions = base) => {
  const mounted = mountCalendar(options);
  live.push(mounted);
  return mounted.root;
};
const pointer = (el: Element, type: string, x: number, y: number) =>
  el.dispatchEvent(
    new (window as any).PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      pointerType: "mouse",
      button: 0,
      clientX: x,
      clientY: y,
    }),
  );

test("an editable event carries data-editable and a resize handle", () => {
  const root = open();
  assert.equal(
    root.querySelector("[data-chrono-event]")?.hasAttribute("data-editable"),
    true,
  );
  assert.equal(
    root
      .querySelector("[data-chrono-resize]")
      ?.getAttribute("data-chrono-resize"),
    "end",
  );
});

test("a pointer drag proposes a move; a click does not", async () => {
  const proposals: any[] = [];
  const root = open({
    ...base,
    hitTest: () => ({ cellKey: "2026-11-19" }),
    onEventChange: (p) => void proposals.push(p),
  });
  const event = () => root.querySelector("[data-chrono-event]") as Element;
  pointer(event(), "pointerdown", 10, 10);
  pointer(event(), "pointerup", 10, 10);
  assert.equal(proposals.length, 0);
  pointer(event(), "pointerdown", 10, 10);
  pointer(event(), "pointermove", 60, 10);
  await new Promise((r) => setTimeout(r, 40));
  assert.ok(root.querySelector("[data-drag-preview]"));
  pointer(event(), "pointerup", 60, 10);
  assert.equal(proposals.length, 1);
  assert.equal(proposals[0].kind, "move");
  assert.equal(root.querySelector("[data-drag-preview]"), null);
});

test("without editable there is no data-editable", () => {
  const root = open({ ...base, editable: false });
  assert.equal(
    root.querySelector("[data-chrono-event]")?.hasAttribute("data-editable"),
    false,
  );
});
