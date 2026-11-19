import { compare, toEpochDay, toSecondOfDay } from "../../foundation/index.js";
import type { CalendarEventInput, NormalizedEvent } from "../events/types.js";
import { compareEventIds } from "../events/sort.js";
import { buildTimelineAxis } from "./timeline-axis.js";
import { buildResourceTree } from "./tree.js";
import type {
  ResourceBuildContext,
  ResourceInput,
  TimelineLayout,
  TimelinePiece,
  TimelineRow,
  TimelineUnit,
} from "./types.js";
import { clampWindow, windowInfo } from "./windowing.js";

const DAY = 86400;
const wall = (v: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}) => toEpochDay(v as never) * DAY + toSecondOfDay(v as never);

/** Lane packing per row on the continuous axis: first fit, half-open (plan 10 R7). */
function packLanes<T extends CalendarEventInput>(
  pieces: Omit<TimelinePiece<T>, "lane">[],
): { placed: TimelinePiece<T>[]; lanes: number } {
  const sorted = [...pieces].sort((a, b) => {
    const time = compare(a.start, b.start);
    if (time !== 0) return time;
    if (a.width !== b.width) return b.width - a.width;
    const id = compareEventIds(a.eventId, b.eventId);
    if (id !== 0) return id;
    return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  });
  const ends: number[] = [];
  const placed: TimelinePiece<T>[] = [];
  for (const piece of sorted) {
    const start = piece.left;
    const end = Math.max(piece.left + piece.width, piece.left + 1e-9);
    let lane = ends.findIndex((laneEnd) => laneEnd <= start);
    if (lane < 0) {
      lane = ends.length;
      ends.push(end);
    } else {
      ends[lane] = end;
    }
    placed.push({ ...piece, lane });
  }
  return { placed, lanes: Math.max(1, ends.length) };
}

/**
 * The resource timeline (plan 10 R6/R7): one row per visible resource, events
 * placed on the wall-time axis as `left`/`width` fractions and packed in lanes.
 */
export function layoutTimeline<
  TEvent extends CalendarEventInput,
  TResource extends ResourceInput,
>(
  ctx: ResourceBuildContext<TEvent, TResource>,
): TimelineLayout<TEvent, TResource> {
  const definition = ctx.definition;
  const headerUnits = (definition.headerRows ?? [
    "day",
    "hour",
  ]) as TimelineUnit[];
  const firstDay = (ctx.days[0] ?? { date: ctx.range.start }).date;
  const dayCount = ctx.days.length || 1;
  const axis = buildTimelineAxis(
    firstDay,
    dayCount,
    definition.slot ?? { minutes: 60 },
    headerUnits,
    ctx.locale,
  );
  const axisStart = wall(axis.start);
  const axisEnd = axisStart + axis.length;
  const nowSeconds = wall(ctx.now);

  const { rows } = buildResourceTree(
    ctx.resources,
    ctx.collapsed,
    ctx.getLabel,
  );
  const window = clampWindow(rows.length, ctx.resourceWindow);
  const slotWindow = clampWindow(axis.slots.length, ctx.slotWindow);
  const visibleRows = rows.slice(window.start, window.end);
  const visibleKeys = new Set(
    visibleRows.filter((r) => !r.group).map((r) => r.key),
  );

  const byRow = new Map<string, Omit<TimelinePiece<TEvent>, "lane">[]>();
  for (const event of ctx.events as readonly NormalizedEvent<TEvent>[]) {
    const s = wall(event.start);
    const e = Math.max(wall(event.end), s);
    if (e < axisStart || s >= axisEnd || (e === s && s < axisStart)) continue;
    if (e === axisStart && s < axisStart) continue;
    const from = Math.max(s, axisStart);
    const to = Math.min(e, axisEnd);
    for (const id of event.resourceIds ?? []) {
      const key = String(id);
      if (!visibleKeys.has(key)) continue;
      const list = byRow.get(key) ?? [];
      list.push({
        key: `${event.key}:${encodeURIComponent(key)}`,
        event: event.event,
        eventId: event.id,
        start: event.start,
        end: event.end,
        allDay: event.allDay,
        resourceKey: key,
        resourceId: id,
        rowKey: key,
        left: (from - axisStart) / axis.length,
        width: (to - from) / axis.length,
        continuesBefore: s < axisStart,
        continuesAfter: e > axisEnd,
        past: e <= nowSeconds,
        recurrence: event.recurrence,
      });
      byRow.set(key, list);
    }
  }

  const pieces: TimelinePiece<TEvent>[] = [];
  const timelineRows: TimelineRow<TResource>[] = visibleRows.map((row) => {
    const { placed, lanes } = packLanes(byRow.get(row.key) ?? []);
    pieces.push(...placed);
    return { ...row, lanes };
  });

  const trimmed =
    slotWindow.start === 0 && slotWindow.end === axis.slots.length
      ? axis
      : { ...axis, slots: axis.slots.slice(slotWindow.start, slotWindow.end) };

  return {
    kind: "timeline",
    axis: trimmed,
    rows: timelineRows,
    pieces,
    grouped: rows.some((row) => row.group),
    window: windowInfo(rows.length, axis.slots.length, window, slotWindow),
  };
}
