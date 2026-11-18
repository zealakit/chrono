import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { createElement as h } from "react";
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
  type CalendarOptions,
  resourceViews,
} from "../dist/calendar/index.js";
import { resetDom } from "./support/dom.ts";

const base: CalendarOptions = {
  id: "cal",
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 12),
  weekStartsOn: 1,
  views: resourceViews,
  defaultDate: { calendar: "gregory", year: 2026, month: 11, day: 17 } as never,
};
const RESOURCES = [
  { id: "bld", parentId: undefined },
  { id: "A", parentId: "bld" },
  { id: "C" },
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
    start: "2026-11-17T12:00",
    end: "2026-11-17T13:00",
    resourceId: "C",
  },
];

const timeline = () =>
  h(CalendarTimeline, {
    children: (l: any) => [
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
        h(
          CalendarTimelineRow,
          { key: row.key, row },
          h(CalendarTimelineRowHeader, { row }),
          ...l.axis.slots
            .slice(0, 2)
            .map((slot: any) =>
              h(CalendarTimelineCell, { key: slot.key, row, slot }),
            ),
          ...l.pieces
            .filter((p: any) => p.rowKey === row.key)
            .map((p: any) =>
              h(CalendarResourceEvent, { key: p.key, piece: p }, "ev"),
            ),
        ),
      ),
    ],
  });

const resourceDay = () =>
  h(CalendarResourceGrid, {
    children: (l: any) => [
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
  });

beforeEach(resetDom);
afterEach(cleanup);

test("timeline renders a treegrid with levels, lanes, header spans and positioned events", () => {
  const { container } = render(
    h(
      Calendar,
      {
        ...base,
        defaultView: "timelineDay",
        resources: RESOURCES,
        events: EVENTS as never,
      },
      timeline(),
    ),
  );
  const root = container.querySelector("[role=treegrid]") as HTMLElement;
  assert.ok(root);
  const rows = container.querySelectorAll("[role=row]");
  assert.equal(rows.length, 3);
  assert.equal(rows[0]?.getAttribute("aria-expanded"), "true");
  assert.equal(rows[1]?.getAttribute("aria-level"), "2");
  assert.match(rows[1]?.getAttribute("style") ?? "", /--chrono-row-lanes/);
  const spans = [...container.querySelectorAll("[role=columnheader]")].map(
    (n) => n.getAttribute("aria-colspan"),
  );
  assert.ok(spans.includes("24"));
  const event = container.querySelector("[data-chrono-event]") as HTMLElement;
  assert.match(
    event.getAttribute("style") ?? "",
    /--chrono-event-left: 0\.375/,
  );
  assert.equal(event.getAttribute("data-resource-id"), "A");
});

test("clicking a group row header collapses and expands it", () => {
  const { container } = render(
    h(
      Calendar,
      {
        ...base,
        defaultView: "timelineDay",
        resources: RESOURCES,
        events: EVENTS as never,
      },
      timeline(),
    ),
  );
  const header = container.querySelector(
    "[role=rowheader][data-resource-group]",
  ) as HTMLElement;
  fireEvent.click(header);
  assert.equal(container.querySelectorAll("[role=row]").length, 2);
  assert.equal(container.querySelector("[data-resource-id=A][role=row]"), null);
  fireEvent.click(
    container.querySelector(
      "[role=rowheader][data-resource-group]",
    ) as HTMLElement,
  );
  assert.equal(container.querySelectorAll("[role=row]").length, 3);
});

test("resource day renders column and group headers with colspan", () => {
  const { container } = render(
    h(
      Calendar,
      {
        ...base,
        defaultView: "resourceDay",
        resources: RESOURCES,
        events: EVENTS as never,
      },
      resourceDay(),
    ),
  );
  const headers = container.querySelectorAll("[role=columnheader]");
  assert.equal(headers.length, 3);
  assert.equal(
    container
      .querySelector("[data-resource-group]")
      ?.getAttribute("aria-colspan"),
    "1",
  );
  assert.equal(container.querySelectorAll("[data-chrono-event]").length, 2);
});

test("the base calendar still works without resources", () => {
  const { container } = render(
    h(Calendar, { ...base, defaultView: "month" }, h("div", null, "x")),
  );
  assert.equal(
    container.querySelector("[data-layout]")?.getAttribute("data-layout"),
    "month",
  );
});
