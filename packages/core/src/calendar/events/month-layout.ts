import {
  type PlainDateTime,
  compare,
  toEpochDay,
} from "../../foundation/index.js";
import { coveredDays } from "./normalize.js";
import { compareMonthSegments } from "./sort.js";
import type {
  CalendarEventInput,
  MonthEventLayout,
  MonthSegment,
  NormalizedEvent,
} from "./types.js";

export type MonthLayoutEventsOptions = {
  /** Wall time in the display zone, used to set `past` (plan 05 E19). */
  now?: PlainDateTime;
};

type HostCell = {
  month: number;
  week: number;
  column: number;
  /** ISO date, the cell's `data-chrono-key`. */
  key: string;
};

/**
 * The month grid that owns each visible day. A day that exists twice in a
 * multi-month layout (once in-month, once as an adjacent day) is hosted by its
 * in-month grid only; leading/trailing adjacent days with no in-month grid in
 * the layout fall back to the grid that shows them (plan 05 13.6).
 */
function buildHostMap(layout: MonthEventLayout): Map<number, HostCell> {
  const host = new Map<number, HostCell>();
  const visit = (outsideMonth: boolean) => {
    layout.months.forEach((month, monthIndex) => {
      month.weeks.forEach((week, weekIndex) => {
        week.days
          .filter((day) => !day.hidden)
          .forEach((day, column) => {
            if (day.outsideMonth !== outsideMonth) {
              return;
            }
            const epoch = toEpochDay(day.date);
            if (!outsideMonth || !host.has(epoch)) {
              host.set(epoch, {
                month: monthIndex,
                week: weekIndex,
                column,
                key: day.key,
              });
            }
          });
      });
    });
  };
  visit(false); // in-month days win
  visit(true); // leading/trailing adjacent days fill the gaps
  return host;
}

type Piece<T extends CalendarEventInput> = {
  month: number;
  week: number;
  segment: MonthSegment<T>;
};

/**
 * Lay out normalized events into month segments (plan 05 §2.3): split each
 * event per week row, sort with the E6 order and pack lanes first-fit.
 * All-day events become one spanning piece per week row; timed events become
 * one piece per day they cover.
 */
export function layoutMonthEvents<T extends CalendarEventInput>(
  events: readonly NormalizedEvent<T>[],
  layout: MonthEventLayout,
  options: MonthLayoutEventsOptions = {},
): MonthSegment<T>[] {
  const host = buildHostMap(layout);
  const now = options.now;
  const pieces: Piece<T>[] = [];

  for (const event of events) {
    const { firstDay, lastDay } = coveredDays(
      event.start,
      event.end,
      event.allDay,
    );
    const rows = new Map<
      string,
      {
        month: number;
        week: number;
        cells: { column: number; day: number; key: string }[];
      }
    >();
    for (let day = firstDay; day <= lastDay; day += 1) {
      const cell = host.get(day);
      if (!cell) {
        continue; // hidden day, or an adjacent-day duplicate
      }
      const rowKey = `${cell.month}:${cell.week}`;
      let row = rows.get(rowKey);
      if (!row) {
        row = { month: cell.month, week: cell.week, cells: [] };
        rows.set(rowKey, row);
      }
      row.cells.push({ column: cell.column, day, key: cell.key });
    }

    for (const row of rows.values()) {
      row.cells.sort((a, b) => a.column - b.column);
      const first = row.cells[0] as (typeof row.cells)[number];
      const last = row.cells[
        row.cells.length - 1
      ] as (typeof row.cells)[number];
      const base = {
        event: event.event,
        start: event.start,
        end: event.end,
        past: now !== undefined && compare(event.end, now) <= 0,
      };
      if (event.allDay) {
        pieces.push({
          month: row.month,
          week: row.week,
          segment: {
            ...base,
            key: `${event.key}:${first.key}`,
            allDay: true,
            continuesBefore: first.day > firstDay,
            continuesAfter: last.day < lastDay,
            month: row.month,
            week: row.week,
            startColumn: first.column,
            days: row.cells.length,
            lane: 0,
            hidden: false,
          },
        });
      } else {
        for (const cell of row.cells) {
          pieces.push({
            month: row.month,
            week: row.week,
            segment: {
              ...base,
              key: `${event.key}:${cell.key}`,
              allDay: false,
              continuesBefore: cell.day > firstDay,
              continuesAfter: cell.day < lastDay,
              month: row.month,
              week: row.week,
              startColumn: cell.column,
              days: 1,
              lane: 0,
              hidden: false,
            },
          });
        }
      }
    }
  }

  // Group by week row, sort with the E6 order and assign lanes first-fit.
  const groups = new Map<string, MonthSegment<T>[]>();
  for (const piece of pieces) {
    const key = `${piece.month}:${piece.week}`;
    const list = groups.get(key) ?? [];
    groups.set(key, list);
    list.push(piece.segment);
  }

  const result: MonthSegment<T>[] = [];
  for (const group of groups.values()) {
    group.sort(compareMonthSegments);
    const lanes: Set<number>[] = [];
    for (const segment of group) {
      let lane = 0;
      while (laneOverlaps(lanes[lane], segment.startColumn, segment.days)) {
        lane += 1;
      }
      if (!lanes[lane]) {
        lanes[lane] = new Set();
      }
      const occupied = lanes[lane];
      for (
        let c = segment.startColumn;
        c < segment.startColumn + segment.days;
        c += 1
      ) {
        occupied.add(c);
      }
      result.push({ ...segment, lane });
    }
  }
  return result;
}

function laneOverlaps(
  occupied: Set<number> | undefined,
  start: number,
  days: number,
): boolean {
  if (!occupied) {
    return false;
  }
  for (let c = start; c < start + days; c += 1) {
    if (occupied.has(c)) {
      return true;
    }
  }
  return false;
}
