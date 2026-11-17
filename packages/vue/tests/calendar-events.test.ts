import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";
import {
  Calendar,
  CalendarEvent,
  CalendarEvents,
  CalendarMonthGrid,
  CalendarMoreButton,
} from "../dist/calendar/index.js";
import { resetDom } from "./support/dom.ts";

const base = {
  id: "cal",
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 12),
  weekStartsOn: 1,
};

type AppEvent = {
  id: string;
  start: string;
  end: string;
  allDay?: boolean;
  title: string;
};

const EVENTS: AppEvent[] = [
  {
    id: "A",
    start: "2026-11-16",
    end: "2026-11-19",
    allDay: true,
    title: "Holiday",
  },
  {
    id: "B",
    start: "2026-11-17T09:00",
    end: "2026-11-17T10:00",
    title: "Stand-up",
  },
  {
    id: "C",
    start: "2026-11-17",
    end: "2026-11-18",
    allDay: true,
    title: "All day",
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
                        h(
                          CalendarEvent,
                          { key: segment.key, segment },
                          () => (segment.event as AppEvent).title,
                        ),
                      ),
                  },
                ),
                h(CalendarMoreButton, { day }),
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

test("events render with data-chrono-event and --chrono-* custom properties", async () => {
  const wrapper = mountMonth({ ...base, events: EVENTS });
  await nextTick();
  const events = (wrapper.element as Element).querySelectorAll(
    "[data-chrono-event]",
  );
  assert.equal(events.length, 3);
  const style = (events[0] as HTMLElement).getAttribute("style") ?? "";
  assert.match(style, /--chrono-event-start/);
  assert.match(style, /--chrono-event-days/);
  assert.match(style, /--chrono-event-lane/);
  assert.match(events[0]?.textContent ?? "", /Holiday/);
});

test("clicking an event selects it", async () => {
  const wrapper = mountMonth({ ...base, events: EVENTS });
  await nextTick();
  const holiday = [
    ...(wrapper.element as Element).querySelectorAll("[data-chrono-event]"),
  ].find((el) => el.textContent?.includes("Holiday")) as HTMLElement;
  holiday.dispatchEvent(
    new window.MouseEvent("click", { bubbles: true, cancelable: true }),
  );
  await nextTick();
  await nextTick();
  assert.equal(holiday.getAttribute("data-selected"), "");
  assert.equal(holiday.getAttribute("aria-pressed"), "true");
});

test("the +N more button emits moreActivate", async () => {
  const wrapper = mountMonth({
    ...base,
    eventLimit: 2,
    events: [
      {
        id: "A",
        start: "2026-11-16",
        end: "2026-11-19",
        allDay: true,
        title: "A",
      },
      {
        id: "B",
        start: "2026-11-17T09:00",
        end: "2026-11-17T10:00",
        title: "B",
      },
      {
        id: "C",
        start: "2026-11-17",
        end: "2026-11-18",
        allDay: true,
        title: "C",
      },
      {
        id: "D",
        start: "2026-11-18",
        end: "2026-11-23",
        allDay: true,
        title: "D",
      },
    ],
  });
  await nextTick();
  const more = (wrapper.element as Element).querySelector(
    "[data-overflow]",
  ) as HTMLElement;
  assert.ok(more, "expected a +N more button");
  more.dispatchEvent(
    new window.MouseEvent("click", { bubbles: true, cancelable: true }),
  );
  await nextTick();
  const emitted = wrapper.findComponent(Calendar).emitted("moreActivate");
  assert.ok(emitted, "moreActivate should be emitted");
  const first = emitted?.[0];
  assert.ok(first);
  const hidden = (first[1] as { id: string }[]).map((e) => e.id).sort();
  assert.deepEqual(hidden, ["B", "C"]);
});
