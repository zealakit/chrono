import { layoutAllDayRow } from "../events/all-day-row.js";
import { layoutTimeGridEvents } from "../events/time-grid-layout.js";
import type { CalendarEventInput, NormalizedEvent } from "../events/types.js";
import { buildResourceTree } from "./tree.js";
import type {
  ResourceAllDayPiece,
  ResourceBuildContext,
  ResourceColumn,
  ResourceGroupHeader,
  ResourceInput,
  ResourceRow,
  ResourceTimeGridLayout,
  ResourceTimeGridPiece,
} from "./types.js";
import { clampWindow, windowInfo } from "./windowing.js";

const encode = (key: string): string => encodeURIComponent(key);

/**
 * The resource time grid (plan 10 R5): columns are visible days × leaf
 * resources, each laid out independently with the stage-3 algorithm.
 */
export function layoutResourceTimeGrid<
  TEvent extends CalendarEventInput,
  TResource extends ResourceInput,
>(
  ctx: ResourceBuildContext<TEvent, TResource>,
): ResourceTimeGridLayout<TEvent, TResource> {
  const { rows } = buildResourceTree(
    ctx.resources,
    ctx.collapsed,
    ctx.getLabel,
  );
  const leafRows = rows.filter((row) => !row.group);
  const days = ctx.days;
  const dayCount = days.length;
  const totalColumns = leafRows.length * dayCount;

  type Slot = { row: ResourceRow<TResource>; day: (typeof days)[number] };
  const slots: Slot[] = [];
  if (ctx.grouping === "date-first") {
    for (const day of days) {
      for (const row of leafRows) slots.push({ row, day });
    }
  } else {
    for (const row of leafRows) {
      for (const day of days) slots.push({ row, day });
    }
  }
  const window = clampWindow(totalColumns, ctx.resourceWindow);
  const visibleSlots = slots.slice(window.start, window.end);

  const columns: ResourceColumn<TResource>[] = visibleSlots.map((slot, i) => ({
    key: `${slot.row.key}@${slot.day.key}`,
    resourceKey: slot.row.key,
    resourceId: slot.row.id,
    resource: slot.row.resource,
    label: slot.row.label,
    day: slot.day,
    index: window.start + i,
  }));

  const groups: ResourceGroupHeader<TResource>[] = [];
  if (ctx.grouping === "resource-first") {
    for (const row of rows) {
      if (!row.group || !row.expanded) continue;
      const under = leafRows.filter((leaf) => isDescendant(row, leaf, rows));
      if (under.length === 0) continue;
      const first = leafRows.indexOf(under[0] as (typeof leafRows)[number]);
      groups.push({
        key: `group:${row.key}`,
        resourceKey: row.key,
        resource: row.resource,
        label: row.label,
        level: row.level,
        startColumn: first * dayCount,
        colSpan: under.length * dayCount,
      });
    }
  }

  const byResource = new Map<string, NormalizedEvent<TEvent>[]>();
  for (const event of ctx.events) {
    for (const id of event.resourceIds ?? []) {
      const key = String(id);
      const list = byResource.get(key) ?? [];
      list.push(event);
      byResource.set(key, list);
    }
  }

  const pieces: ResourceTimeGridPiece<TEvent>[] = [];
  const allDay: ResourceAllDayPiece<TEvent>[] = [];
  for (const column of columns) {
    const events = byResource.get(column.resourceKey) ?? [];
    if (events.length === 0) continue;
    const one = [column.day];
    const options = {
      dayStart: ctx.dayStart,
      dayEnd: ctx.dayEnd,
      minEventDuration: ctx.minEventDuration,
      longEventsInAllDayRow: ctx.longEventsInAllDayRow,
      now: ctx.now,
    };
    for (const segment of layoutTimeGridEvents(events, one, options)) {
      pieces.push({
        ...segment,
        key: `${segment.key}@${encode(column.resourceKey)}`,
        resourceKey: column.resourceKey,
        resourceId: column.resourceId,
        columnKey: column.key,
      });
    }
    const row = layoutAllDayRow(events, one, {
      longEventsInAllDayRow: ctx.longEventsInAllDayRow,
      now: ctx.now,
    });
    for (const segment of row.segments) {
      allDay.push({
        ...segment,
        key: `${segment.key}@${encode(column.resourceKey)}`,
        resourceKey: column.resourceKey,
        resourceId: column.resourceId,
        columnKey: column.key,
      });
    }
  }

  const rowStart = leafRows.length
    ? Math.floor(
        window.start /
          Math.max(
            1,
            ctx.grouping === "date-first" ? leafRows.length : dayCount,
          ),
      )
    : 0;
  return {
    kind: "resource-time-grid",
    grouping: ctx.grouping,
    rows: leafRows,
    columns,
    groups,
    pieces,
    allDay,
    window: windowInfo(
      leafRows.length,
      totalColumns,
      { start: rowStart },
      { start: window.start },
    ),
  };
}

function isDescendant<T extends ResourceInput>(
  ancestor: ResourceRow<T>,
  node: ResourceRow<T>,
  rows: readonly ResourceRow<T>[],
): boolean {
  const byKey = new Map(rows.map((row) => [row.key, row]));
  let current = node.parentKey;
  while (current !== null) {
    if (current === ancestor.key) return true;
    current = byKey.get(current)?.parentKey ?? null;
  }
  return false;
}
