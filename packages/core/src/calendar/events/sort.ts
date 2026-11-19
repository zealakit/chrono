import { compare, type PlainDateTime } from "../../foundation/index.js";
import type { EventId } from "./types.js";

/** Stable order for ids that may be a string or a number (plan 05 E6). */
export function compareEventIds(a: EventId, b: EventId): number {
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }
  const x = String(a);
  const y = String(b);
  return x < y ? -1 : x > y ? 1 : 0;
}

/** The fields every sortable piece shares. */
export type SortableSegment = {
  startColumn: number;
  days: number;
  allDay: boolean;
  start: PlainDateTime;
  event: { id: EventId };
  key: string;
};

/**
 * The month (and all-day row) sort order (plan 05 E6): start column, longer
 * span first, all-day before timed, start time, then id (and the unique key as
 * the final tie-break so output is deterministic).
 */
export function compareMonthSegments(
  a: SortableSegment,
  b: SortableSegment,
): number {
  if (a.startColumn !== b.startColumn) {
    return a.startColumn - b.startColumn;
  }
  if (a.days !== b.days) {
    return b.days - a.days;
  }
  if (a.allDay !== b.allDay) {
    return a.allDay ? -1 : 1;
  }
  const time = compare(a.start, b.start);
  if (time !== 0) {
    return time;
  }
  const id = compareEventIds(a.event.id, b.event.id);
  if (id !== 0) {
    return id;
  }
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
}
