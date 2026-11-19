import {
  type PlainDate,
  type PlainDateTime,
  compare,
  toEpochDay,
} from "../../foundation/index.js";
import { coveredDays, wallSecondsOf } from "./normalize.js";
import { compareEventIds } from "./sort.js";
import type {
  AgendaItem,
  CalendarEventInput,
  NormalizedEvent,
} from "./types.js";

export type AgendaOptions = {
  /** Include days with no events (plan 05 §2.5), default `false`. */
  showEmptyDays?: boolean;
  now?: PlainDateTime;
};

/** One agenda day and its events (plan 05 §2.5). */
export type AgendaDay<TEvent extends CalendarEventInput = CalendarEventInput> =
  {
    dayKey: string;
    items: AgendaItem<TEvent>[];
  };

function compareAgenda<T extends CalendarEventInput>(
  a: AgendaItem<T>,
  b: AgendaItem<T>,
): number {
  if (a.allDay !== b.allDay) {
    return a.allDay ? -1 : 1;
  }
  const time = compare(a.start, b.start);
  if (time !== 0) {
    return time;
  }
  const da = wallSecondsOf(a.end) - wallSecondsOf(a.start);
  const db = wallSecondsOf(b.end) - wallSecondsOf(b.start);
  if (da !== db) {
    return db - da;
  }
  return compareEventIds(a.event.id, b.event.id);
}

/**
 * The agenda / list view (plan 05 §2.5): one group per day, multi-day events
 * repeated in every day they cover with continuation flags, sorted within a
 * day by all-day first, start time, then duration.
 */
export function layoutAgenda<T extends CalendarEventInput>(
  events: readonly NormalizedEvent<T>[],
  days: readonly { date: PlainDate; key: string }[],
  options: AgendaOptions = {},
): AgendaDay<T>[] {
  const showEmptyDays = options.showEmptyDays ?? false;
  const now = options.now;
  const columnByDay = new Map<number, number>();
  for (let index = 0; index < days.length; index += 1) {
    columnByDay.set(
      toEpochDay((days[index] as { date: PlainDate }).date),
      index,
    );
  }

  const byDay = new Map<number, AgendaItem<T>[]>();
  for (const event of events) {
    const { firstDay, lastDay } = coveredDays(
      event.start,
      event.end,
      event.allDay,
    );
    for (let day = firstDay; day <= lastDay; day += 1) {
      const index = columnByDay.get(day);
      if (index === undefined) {
        continue;
      }
      const dayKey = (days[index] as { key: string }).key;
      const item: AgendaItem<T> = {
        key: `${event.key}:${dayKey}`,
        event: event.event,
        start: event.start,
        end: event.end,
        allDay: event.allDay,
        continuesBefore: day > firstDay,
        continuesAfter: day < lastDay,
        past: now !== undefined && compare(event.end, now) <= 0,
        recurrence: event.recurrence,
        dayKey,
      };
      const list = byDay.get(index);
      if (list) {
        list.push(item);
      } else {
        byDay.set(index, [item]);
      }
    }
  }

  const result: AgendaDay<T>[] = [];
  for (let index = 0; index < days.length; index += 1) {
    const items = byDay.get(index) ?? [];
    if (items.length === 0 && !showEmptyDays) {
      continue;
    }
    items.sort(compareAgenda);
    result.push({ dayKey: (days[index] as { key: string }).key, items });
  }
  return result;
}
