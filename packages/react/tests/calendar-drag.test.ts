import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { createElement as h } from "react";
import {
  Calendar,
  CalendarEvent,
  CalendarEventDragPreview,
  CalendarEventResizeHandle,
  CalendarEvents,
  CalendarMonthGrid,
  type CalendarOptions,
} from "../dist/calendar/index.js";
import { resetDom } from "./support/dom.ts";

const base: CalendarOptions = {
  id: "cal",
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 12),
  weekStartsOn: 1,
  editable: true,
};
const EVENTS = [
  {
    id: "A",
    start: "2026-11-17T09:00",
    end: "2026-11-17T10:00",
    title: "Stand-up",
  },
];

const grid = () =>
  h(CalendarMonthGrid, {
    children: (day: any) => [
      h(CalendarEvents, {
        key: "events",
        day,
        children: (segments: any[]) =>
          segments.map((segment: any) =>
            h(
              CalendarEvent,
              { key: segment.key, segment },
              segment.event.title,
              h(CalendarEventResizeHandle, { segment, edge: "end" }),
            ),
          ),
      }),
      h(CalendarEventDragPreview, { key: "preview", day }, "ghost"),
    ],
  });

const press = (el: Element, type: string, x: number, y: number, extra = {}) =>
  fireEvent(
    el,
    Object.assign(
      new (window as any).PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: "mouse",
        button: 0,
        clientX: x,
        clientY: y,
      }),
      extra,
    ),
  );

beforeEach(resetDom);
afterEach(cleanup);

test("an editable event carries data-editable and a resize handle", () => {
  const { container } = render(
    h(Calendar, { ...base, events: EVENTS as never }, grid()),
  );
  const event = container.querySelector("[data-chrono-event]") as HTMLElement;
  assert.equal(event.hasAttribute("data-editable"), true);
  assert.ok(event.getAttribute("aria-keyshortcuts"));
  const handle = container.querySelector("[data-chrono-resize]") as HTMLElement;
  assert.equal(handle.getAttribute("data-chrono-resize"), "end");
});

test("a pointer drag past the threshold proposes a move; a click does not", async () => {
  const proposals: any[] = [];
  const { container } = render(
    h(
      Calendar,
      {
        ...base,
        events: EVENTS as never,
        hitTest: () => ({ cellKey: "2026-11-19" }),
        onEventChange: (p: any) => {
          proposals.push(p);
        },
      },
      grid(),
    ),
  );
  const event = container.querySelector("[data-chrono-event]") as HTMLElement;
  // A click: no movement.
  press(event, "pointerdown", 10, 10);
  press(event, "pointerup", 10, 10);
  assert.equal(proposals.length, 0);
  // A drag.
  press(event, "pointerdown", 10, 10);
  press(event, "pointermove", 60, 10);
  await act(async () => {
    await new Promise((r) => setTimeout(r, 40));
  });
  assert.ok(
    container.querySelector("[data-drag-preview]"),
    "preview renders mid-drag",
  );
  assert.equal(
    container
      .querySelector("[data-chrono-root], [data-dragging]")
      ?.hasAttribute("data-dragging"),
    true,
  );
  press(event, "pointerup", 60, 10);
  assert.equal(proposals.length, 1);
  assert.equal(proposals[0].kind, "move");
  assert.equal(proposals[0].source, "pointer");
  assert.equal(container.querySelector("[data-drag-preview]"), null);
});

test("Escape-less cancel: pointercancel proposes nothing", async () => {
  const proposals: any[] = [];
  const { container } = render(
    h(
      Calendar,
      {
        ...base,
        events: EVENTS as never,
        hitTest: () => ({ cellKey: "2026-11-19" }),
        onEventChange: (p: any) => void proposals.push(p),
      },
      grid(),
    ),
  );
  const event = container.querySelector("[data-chrono-event]") as HTMLElement;
  press(event, "pointerdown", 10, 10);
  press(event, "pointermove", 60, 10);
  press(event, "pointercancel", 60, 10);
  assert.equal(proposals.length, 0);
});

test("without editable no drag and no data-editable", () => {
  const { container } = render(
    h(Calendar, { ...base, editable: false, events: EVENTS as never }, grid()),
  );
  const event = container.querySelector("[data-chrono-event]") as HTMLElement;
  assert.equal(event.hasAttribute("data-editable"), false);
});
