import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { mount, type VueWrapper } from "@vue/test-utils";
import { recurrence } from "../dist/calendar/index.js";
import { resetDom } from "./support/dom.ts";
import { ReferenceCalendar } from "./support/reference.ts";

const events = [
  {
    id: "a",
    start: "2026-11-02T09:00:00",
    end: "2026-11-02T10:00:00",
    rrule: "FREQ=WEEKLY;COUNT=4;BYDAY=MO",
  },
  {
    id: "o",
    recurringId: "a",
    recurrenceId: "2026-11-09T09:00:00",
    start: "2026-11-10T11:00:00",
    end: "2026-11-10T12:00:00",
  },
];

const mounted: VueWrapper[] = [];

beforeEach(resetDom);
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

test("Vue forwards the recurrence pack and renders occurrences", () => {
  const wrapper = mount(ReferenceCalendar, {
    props: {
      options: {
        id: "cal",
        locale: "en-US",
        timeZone: "UTC",
        now: Date.UTC(2026, 10, 17, 12),
        weekStartsOn: 1,
        date: "2026-11-02",
        view: "month",
        events,
        recurrence,
      },
    },
    attachTo: document.body,
  });
  mounted.push(wrapper);
  const root = wrapper.element as Element;
  assert.equal(root.querySelectorAll("[data-chrono-event]").length, 4);
  assert.equal(root.querySelectorAll("[data-override]").length, 1);
  assert.equal(root.querySelectorAll("[data-recurring]").length, 4);
});
