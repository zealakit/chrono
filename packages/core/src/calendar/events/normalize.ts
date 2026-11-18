import {
  type DateInput,
  type DateRange,
  type DateTimeInput,
  type PlainDateTime,
  addDays,
  compare,
  plainDateTime,
  toEpochDay,
  toPlainDate,
  toPlainDateTime,
  toSecondOfDay,
} from "../../foundation/index.js";
import type { CalendarEventInput, EventId, NormalizedEvent } from "./types.js";

export type NormalizeOptions = {
  /** Events fully outside this range are dropped (plan 05 §2.2). */
  visibleRange: DateRange;
  /** Display zone. Defaults to `"UTC"`, never the host zone. */
  timeZone?: string;
};

const MIDNIGHT = { hour: 0, minute: 0, second: 0 } as const;
const warned = new Set<string>();

/** One development warning per cause per process (plan 13). */
export function warnOnce(message: string): void {
  if (warned.has(message)) {
    return;
  }
  warned.add(message);
  console.warn(message);
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function isDateOnlyValue(value: DateTimeInput | DateInput): boolean {
  if (typeof value === "string") {
    return DATE_ONLY.test(value);
  }
  if (value instanceof Date) {
    return false;
  }
  return !("hour" in value);
}

/** `allDay` is explicit, else inferred from a date-only `start` (plan 05 E2/R4). */
function resolveAllDay(
  event: CalendarEventInput,
  start: DateTimeInput | DateInput,
): boolean {
  return event.allDay === undefined ? isDateOnlyValue(start) : event.allDay;
}

/** An endpoint as wall time in the display zone (all-day: midnight of the date). */
function toWallTime(
  input: DateTimeInput | DateInput,
  allDay: boolean,
  timeZone: string,
): PlainDateTime {
  if (allDay) {
    return plainDateTime(toPlainDate(input as DateInput, timeZone), MIDNIGHT);
  }
  return toPlainDateTime(input as DateTimeInput, timeZone);
}

/** The distinct resource ids of an event input (plan 10 R2). */
function resourceIdsOf(
  value: EventId | readonly EventId[] | undefined,
): readonly EventId[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  const list = Array.isArray(value)
    ? (value as readonly EventId[])
    : [value as EventId];
  const seen = new Set<string>();
  return list.filter((id) => {
    const key = String(id);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/** Inclusive `[first, last]` day span an event covers (all-day end is exclusive). */
export function coveredDays(
  start: PlainDateTime,
  end: PlainDateTime,
  allDay: boolean,
): { firstDay: number; lastDay: number } {
  const firstDay = toEpochDay(start);
  const endsAtMidnight = end.hour === 0 && end.minute === 0 && end.second === 0;
  const lastDay = allDay
    ? toEpochDay(end) - 1
    : toEpochDay(end) - (endsAtMidnight ? 1 : 0);
  return { firstDay, lastDay };
}

/** Wall-clock seconds since epoch as if the value were UTC (no host zone). */
export function wallSecondsOf(value: PlainDateTime): number {
  return toEpochDay(value) * 86400 + toSecondOfDay(value);
}

/**
 * Parse events into display-zone wall time, resolve all-day, swap reversed
 * ranges, dedupe ids and drop events fully outside `visibleRange` (plan 05 §2.2).
 */
export function normalizeEvents<T extends CalendarEventInput>(
  events: readonly T[],
  options: NormalizeOptions,
): NormalizedEvent<T>[] {
  const timeZone = options.timeZone ?? "UTC";
  const rangeStart = toEpochDay(options.visibleRange.start);
  const rangeEnd = toEpochDay(options.visibleRange.end);
  const seen = new Map<EventId, number>();
  const result: NormalizedEvent<T>[] = [];

  for (const event of events) {
    const allDay = resolveAllDay(event, event.start);
    let start = toWallTime(event.start, allDay, timeZone);
    const rawEnd = (event as { end?: unknown }).end;
    let end: PlainDateTime;
    if (rawEnd == null) {
      end = allDay ? plainDateTime(addDays(start, 1), MIDNIGHT) : start;
      warnOnce(
        `[chrono] Event "${String(event.id)}" has no end; treated as ${allDay ? "one day" : "zero length"}.`,
      );
    } else {
      end = toWallTime(rawEnd as DateTimeInput | DateInput, allDay, timeZone);
    }

    if (allDay) {
      const startDay = toEpochDay(start);
      const endDay = toEpochDay(end);
      if (endDay === startDay) {
        // A one-day event: `{ start: "2026-11-17", end: "2026-11-17" }` (E3).
        end = plainDateTime(addDays(start, 1), MIDNIGHT);
        warnOnce(
          `[chrono] All-day event "${String(event.id)}" has end === start; treated as one day.`,
        );
      } else if (endDay < startDay) {
        const tmp = start;
        start = end;
        end = tmp;
        warnOnce(
          `[chrono] All-day event "${String(event.id)}" has end before start; swapped.`,
        );
      }
    } else if (compare(end, start) < 0) {
      const tmp = start;
      start = end;
      end = tmp;
      warnOnce(
        `[chrono] Event "${String(event.id)}" has end before start; swapped.`,
      );
    }

    const { firstDay, lastDay } = coveredDays(start, end, allDay);
    if (lastDay < rangeStart || firstDay > rangeEnd) {
      continue; // fully outside the visible range
    }

    const count = seen.get(event.id) ?? 0;
    seen.set(event.id, count + 1);
    const key = count === 0 ? String(event.id) : `${String(event.id)}#${count}`;
    if (count > 0) {
      warnOnce(`[chrono] Duplicate event id "${String(event.id)}".`);
    }

    result.push({
      id: event.id,
      key,
      event,
      start,
      end,
      allDay,
      recurringId: event.recurringId,
      calendarId: event.calendarId,
      resourceIds: resourceIdsOf(event.resourceId),
    });
  }

  return result;
}
