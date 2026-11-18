import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";
import {
  Calendar,
  CalendarResourceEvent,
  CalendarResourceGrid,
  CalendarResourceGroupHeader,
  CalendarResourceHeader,
  CalendarTimeline,
  CalendarTimelineCell,
  CalendarTimelineHeaderCell,
  CalendarTimelineRow,
  CalendarTimelineRowHeader,
  resourceViews,
} from "../dist/calendar/index.js";
import { resetDom } from "./support/dom.ts";

const base = {
  id: "cal",
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 12),
  weekStartsOn: 1,
  views: resourceViews,
  defaultDate: { calendar: "gregory", year: 2026, month: 11, day: 17 },
  resources: [{ id: "bld" }, { id: "A", parentId: "bld" }, { id: "C" }],
  events: [
    {
      id: 1,
      start: "2026-11-17T09:00",
      end: "2026-11-17T10:30",
      resourceId: "A",
    },
    {
      id: 2,
      start: "2026-11-17T12:00",
      end: "2026-11-17T13:00",
      resourceId: "C",
    },
  ],
};
const mounted: VueWrapper[] = [];
beforeEach(resetDom);
afterEach(() => {
  for (const w of mounted.splice(0)) w.unmount();
});
function open(options: Record<string, unknown>, content: () => unknown) {
  const Wrapper = defineComponent({
    setup: () => () => h(Calendar, options, content as never),
  });
  const w = mount(Wrapper, { attachTo: document.body });
  mounted.push(w);
  return w.element as Element;
}
const timeline = () => ({
  default: () =>
    h(CalendarTimeline, null, {
      default: ({ layout: l }: any) => [
        ...l.axis.headerRows.map((r: any) =>
          h(
            "div",
            { key: r.unit },
            r.cells.map((cell: any) =>
              h(CalendarTimelineHeaderCell, { key: cell.key, cell }),
            ),
          ),
        ),
        ...l.rows.map((row: any) =>
          h(CalendarTimelineRow, { key: row.key, row }, () => [
            h(CalendarTimelineRowHeader, { row }),
            ...l.axis.slots
              .slice(0, 2)
              .map((slot: any) =>
                h(CalendarTimelineCell, { key: slot.key, row, slot }),
              ),
            ...l.pieces
              .filter((p: any) => p.rowKey === row.key)
              .map((p: any) =>
                h(CalendarResourceEvent, { key: p.key, piece: p }, () => "ev"),
              ),
          ]),
        ),
      ],
    }),
});

test("timeline renders a treegrid with levels, header spans and positioned events", async () => {
  const root = open(
    { ...base, defaultView: "timelineDay" },
    timeline().default as never,
  );
  await nextTick();
  assert.ok(root.querySelector("[role=treegrid]"));
  const rows = root.querySelectorAll("[role=row]");
  assert.equal(rows.length, 3);
  assert.equal(rows[0]?.getAttribute("aria-expanded"), "true");
  assert.equal(rows[1]?.getAttribute("aria-level"), "2");
  const spans = [...root.querySelectorAll("[role=columnheader]")].map((n) =>
    n.getAttribute("aria-colspan"),
  );
  assert.ok(spans.includes("24"));
  assert.match(
    root.querySelector("[data-chrono-event]")?.getAttribute("style") ?? "",
    /--chrono-event-left: 0\.375/,
  );
});

test("clicking a group row header collapses it", async () => {
  const root = open(
    { ...base, defaultView: "timelineDay" },
    timeline().default as never,
  );
  await nextTick();
  (
    root.querySelector("[role=rowheader][data-resource-group]") as HTMLElement
  ).click();
  await nextTick();
  assert.equal(root.querySelectorAll("[role=row]").length, 2);
});

test("resource day renders column and group headers", async () => {
  const root = open({ ...base, defaultView: "resourceDay" }, () =>
    h(CalendarResourceGrid, null, {
      default: ({ layout: l }: any) => [
        ...l.groups.map((g: any) =>
          h(CalendarResourceGroupHeader, { key: g.key, group: g }),
        ),
        ...l.columns.map((c: any) =>
          h(CalendarResourceHeader, { key: c.key, column: c }),
        ),
        ...l.pieces.map((p: any) =>
          h(CalendarResourceEvent, { key: p.key, piece: p }),
        ),
      ],
    }),
  );
  await nextTick();
  assert.equal(root.querySelectorAll("[role=columnheader]").length, 3);
  assert.equal(root.querySelectorAll("[data-chrono-event]").length, 2);
});
