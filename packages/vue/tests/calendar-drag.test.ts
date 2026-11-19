import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";
import {
  Calendar,
  CalendarEvent,
  CalendarEventDragPreview,
  CalendarEventResizeHandle,
  CalendarEvents,
  CalendarMonthGrid,
} from "../dist/calendar/index.js";
import { resetDom } from "./support/dom.ts";

const base = {
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
const mounted: VueWrapper[] = [];
beforeEach(resetDom);
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

function mountMonth(options: Record<string, unknown>) {
  const Wrapper = defineComponent({
    setup() {
      return () =>
        h(Calendar, options, () => [
          h(
            CalendarMonthGrid,
            { month: 0 },
            {
              default: ({ day }: any) => [
                h(
                  CalendarEvents,
                  { day },
                  {
                    default: ({ segments }: { segments: any[] }) =>
                      segments.map((segment: any) =>
                        h(CalendarEvent, { key: segment.key, segment }, () => [
                          segment.event.title,
                          h(CalendarEventResizeHandle, {
                            segment,
                            edge: "end",
                          }),
                        ]),
                      ),
                  },
                ),
                h(CalendarEventDragPreview, { day }, () => "ghost"),
              ],
            },
          ),
        ]);
    },
  });
  const wrapper = mount(Wrapper, { attachTo: document.body });
  mounted.push(wrapper);
  return wrapper;
}

const press = (el: Element, type: string, x: number, y: number) =>
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

test("an editable event carries data-editable and a resize handle", async () => {
  const root = mountMonth({ ...base, events: EVENTS }).element as Element;
  await nextTick();
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
  const root = mountMonth({
    ...base,
    events: EVENTS,
    hitTest: () => ({ cellKey: "2026-11-19" }),
    onEventChange: (p: any) => void proposals.push(p),
  }).element as Element;
  await nextTick();
  await new Promise((r) => setTimeout(r, 20));
  const event = root.querySelector("[data-chrono-event]") as Element;
  press(event, "pointerdown", 10, 10);
  press(event, "pointerup", 10, 10);
  assert.equal(proposals.length, 0);
  press(event, "pointerdown", 10, 10);
  press(event, "pointermove", 60, 10);
  await new Promise((r) => setTimeout(r, 40));
  await nextTick();
  assert.ok(root.querySelector("[data-drag-preview]"));
  press(event, "pointerup", 60, 10);
  await nextTick();
  assert.equal(proposals.length, 1);
  assert.equal(proposals[0].kind, "move");
  assert.equal(root.querySelector("[data-drag-preview]"), null);
});

test("without editable there is no data-editable", async () => {
  const root = mountMonth({ ...base, editable: false, events: EVENTS })
    .element as Element;
  await nextTick();
  assert.equal(
    root.querySelector("[data-chrono-event]")?.hasAttribute("data-editable"),
    false,
  );
});
