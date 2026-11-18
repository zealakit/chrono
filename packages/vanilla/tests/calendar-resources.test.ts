import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import {
  applyAttributes,
  createCalendar,
  resourceViews,
  type CalendarOptions,
} from "../dist/calendar/index.js";
import { resetDom } from "./support/dom.ts";

const base: CalendarOptions = {
  id: "cal",
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 12),
  weekStartsOn: 1,
  views: resourceViews,
  defaultView: "timelineDay",
  defaultDate: { calendar: "gregory", year: 2026, month: 11, day: 17 } as never,
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
const el = (
  tag: string,
  attributes: object,
  ...children: (Node | string)[]
) => {
  const node = document.createElement(tag);
  applyAttributes(node, attributes as never);
  node.append(...children);
  return node;
};
let calendar: ReturnType<typeof createCalendar> | undefined;
beforeEach(resetDom);
afterEach(() => calendar?.destroy());

function render(root: HTMLElement, c: ReturnType<typeof createCalendar>) {
  const { controller } = c;
  const l = c.getState().resources as any;
  root.replaceChildren(
    l.kind === "timeline"
      ? el(
          "div",
          controller.getTimelineAttributes(),
          ...l.axis.headerRows.flatMap((r: any) =>
            r.cells.map((cell: any) =>
              el(
                "div",
                controller.getTimelineHeaderCellAttributes(cell),
                cell.label,
              ),
            ),
          ),
          ...l.rows.map((row: any) =>
            el(
              "div",
              controller.getTimelineRowAttributes(row),
              el(
                "div",
                controller.getTimelineRowHeaderAttributes(row),
                row.label,
              ),
              ...l.pieces
                .filter((p: any) => p.rowKey === row.key)
                .map((p: any) =>
                  el("div", controller.getResourcePieceAttributes(p)),
                ),
            ),
          ),
        )
      : el(
          "div",
          {},
          ...l.columns.map((col: any) =>
            el("div", controller.getResourceHeaderAttributes(col), col.label),
          ),
        ),
  );
  c.syncFocus();
}
function open(options: CalendarOptions) {
  const root = document.createElement("div");
  document.body.append(root);
  calendar = createCalendar(root, options);
  const c = calendar;
  c.subscribe(() => render(root, c));
  render(root, c);
  return root;
}

test("timeline attributes: treegrid, levels, lanes and positioned events", () => {
  const root = open(base);
  assert.ok(root.querySelector("[role=treegrid]"));
  const rows = root.querySelectorAll("[role=row]");
  assert.equal(rows.length, 3);
  assert.equal(rows[0]?.getAttribute("aria-expanded"), "true");
  assert.equal(rows[1]?.getAttribute("aria-level"), "2");
  assert.match(rows[1]?.getAttribute("style") ?? "", /--chrono-row-lanes/);
  assert.match(
    root.querySelector("[data-chrono-event]")?.getAttribute("style") ?? "",
    /--chrono-event-left: 0\.375/,
  );
});

test("a delegated click on a group row header collapses it", () => {
  const root = open(base);
  (
    root.querySelector("[role=rowheader][data-resource-group]") as HTMLElement
  ).click();
  assert.equal(root.querySelectorAll("[role=row]").length, 2);
  (
    root.querySelector("[role=rowheader][data-resource-group]") as HTMLElement
  ).click();
  assert.equal(root.querySelectorAll("[role=row]").length, 3);
});

test("resource day columns", () => {
  const root = open({ ...base, defaultView: "resourceDay" });
  assert.equal(root.querySelectorAll("[role=columnheader]").length, 2);
});
