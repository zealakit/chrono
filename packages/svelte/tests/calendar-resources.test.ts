import assert from "node:assert/strict";
import { after, afterEach, test } from "node:test";
import {
  calendarEntryUrl,
  cleanupFixtures,
  mountSource,
  settle,
  type Mounted,
} from "./support/reference.ts";
import { resetDom } from "./support/dom.ts";

const source = `
<script>
  import {
    Calendar, CalendarResourceEvent, CalendarResourceGrid, CalendarResourceGroupHeader,
    CalendarResourceHeader, CalendarTimeline, CalendarTimelineCell, CalendarTimelineHeaderCell,
    CalendarTimelineRow, CalendarTimelineRowHeader, resourceViews,
  } from "${calendarEntryUrl}";
  let { initial = {} } = $props();
</script>
<Calendar {...initial} views={resourceViews}>
  <CalendarTimeline>
    {#snippet children(l)}
      {#each l.axis.headerRows as r (r.unit)}
        <div>{#each r.cells as cell (cell.key)}<CalendarTimelineHeaderCell {cell} />{/each}</div>
      {/each}
      {#each l.rows as row (row.key)}
        <CalendarTimelineRow {row}>
          <CalendarTimelineRowHeader {row} />
          {#each l.axis.slots.slice(0, 2) as slot (slot.key)}<CalendarTimelineCell {row} {slot} />{/each}
          {#each l.pieces.filter((p) => p.rowKey === row.key) as piece (piece.key)}<CalendarResourceEvent {piece}>ev</CalendarResourceEvent>{/each}
        </CalendarTimelineRow>
      {/each}
    {/snippet}
  </CalendarTimeline>
  <CalendarResourceGrid>
    {#snippet children(l)}
      {#each l.groups as group (group.key)}<CalendarResourceGroupHeader {group} />{/each}
      {#each l.columns as column (column.key)}<CalendarResourceHeader {column} />{/each}
      {#each l.pieces as piece (piece.key)}<CalendarResourceEvent {piece} />{/each}
    {/snippet}
  </CalendarResourceGrid>
</Calendar>`;

const base = {
  id: "cal",
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 12),
  weekStartsOn: 1,
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
const live: Mounted[] = [];
afterEach(() => {
  for (const m of live.splice(0)) m.destroy();
  resetDom();
});
after(cleanupFixtures);
const open = async (options: object) => {
  const m = await mountSource(source, options);
  live.push(m);
  await settle();
  return m.target;
};

test("timeline renders a treegrid with levels, spans and positioned events", async () => {
  const root = await open({ ...base, defaultView: "timelineDay" });
  assert.ok(root.querySelector("[role=treegrid]"));
  const rows = root.querySelectorAll("[role=row]");
  assert.equal(rows.length, 3);
  assert.equal(rows[0]?.getAttribute("aria-expanded"), "true");
  assert.equal(rows[1]?.getAttribute("aria-level"), "2");
  assert.ok(
    [...root.querySelectorAll("[role=columnheader]")].some(
      (n) => n.getAttribute("aria-colspan") === "24",
    ),
  );
  assert.match(
    root.querySelector("[data-chrono-event]")?.getAttribute("style") ?? "",
    /--chrono-event-left: 0\.375/,
  );
  assert.equal(root.querySelector("[role=grid]"), null);
});

test("clicking a group row header collapses it", async () => {
  const root = await open({ ...base, defaultView: "timelineDay" });
  (
    root.querySelector("[role=rowheader][data-resource-group]") as HTMLElement
  ).click();
  await settle();
  assert.equal(root.querySelectorAll("[role=row]").length, 2);
});

test("resource day renders column and group headers", async () => {
  const root = await open({ ...base, defaultView: "resourceDay" });
  assert.equal(root.querySelectorAll("[role=columnheader]").length, 3);
  assert.equal(root.querySelectorAll("[data-chrono-event]").length, 2);
});
