import {
  fromEpochDay,
  dayOfWeekFromEpochDay,
  toEpochDay,
} from "../values/plain-date.js";
import type { DayOfWeek, PlainDate } from "../values/types.js";
import type { DateRange } from "../ranges/date-range.js";

/**
 * Date-only availability (stage 1). Plan 11 replaces this with open/blocked
 * rules that carry times, zones and resources.
 *
 * `mode: "available"`: only the listed dates, ranges and weekdays are
 * available. `mode: "blocked"`: the listed ones are blocked, everything else
 * is available.
 */
export type AvailabilitySpec = {
  dates?: readonly PlainDate[];
  ranges?: readonly DateRange[];
  weekdays?: readonly DayOfWeek[];
  mode: "available" | "blocked";
};

export type Availability = {
  isAvailable(date: PlainDate): boolean;
  /** The nearest available date strictly after (`1`) or before (`-1`) `date`, or `null`. */
  nextAvailable(date: PlainDate, direction: 1 | -1): PlainDate | null;
};

const MIN_DAY = -719162; // 0001-01-01
const MAX_DAY = 2932896; // 9999-12-31

type Interval = readonly [start: number, end: number];

function mergeRanges(ranges: readonly DateRange[]): Interval[] {
  const sorted = ranges
    .map((range): Interval => [toEpochDay(range.start), toEpochDay(range.end)])
    .sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1] + 1) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }
  return merged;
}

/** Index of the last interval whose start is `<= day`, or `-1`. */
function lastStartAtOrBefore(
  intervals: readonly Interval[],
  day: number,
): number {
  let low = 0;
  let high = intervals.length - 1;
  let found = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if ((intervals[mid] as Interval)[0] <= day) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return found;
}

export function createAvailability(spec: AvailabilitySpec): Availability {
  const days = new Set((spec.dates ?? []).map(toEpochDay));
  const sortedDays = [...days].sort((a, b) => a - b);
  const intervals = mergeRanges(spec.ranges ?? []);
  const weekdays = new Set<number>(spec.weekdays ?? []);
  const blockedMode = spec.mode === "blocked";

  const listed = (day: number): boolean => {
    if (days.has(day) || weekdays.has(dayOfWeekFromEpochDay(day))) {
      return true;
    }
    const index = lastStartAtOrBefore(intervals, day);
    return index >= 0 && day <= (intervals[index] as Interval)[1];
  };
  const available = (day: number): boolean =>
    blockedMode ? !listed(day) : listed(day);

  /** Smallest available day `>= from` (direction 1) or largest `<= from` (-1). */
  const search = (from: number, direction: 1 | -1): number | null => {
    if (blockedMode) {
      if (weekdays.size === 7) {
        return null;
      }
      let day = from;
      while (day >= MIN_DAY && day <= MAX_DAY) {
        if (!listed(day)) {
          return day;
        }
        const index = lastStartAtOrBefore(intervals, day);
        const inside = index >= 0 && day <= (intervals[index] as Interval)[1];
        if (inside) {
          const interval = intervals[index] as Interval;
          day = direction === 1 ? interval[1] + 1 : interval[0] - 1;
        } else {
          day += direction;
        }
      }
      return null;
    }

    // "available" mode: the answer is the nearest of three candidate sources.
    const candidates: number[] = [];
    if (weekdays.size > 0) {
      for (let step = 0; step < 7; step += 1) {
        const day = from + step * direction;
        if (weekdays.has(dayOfWeekFromEpochDay(day))) {
          candidates.push(day);
          break;
        }
      }
    }
    if (direction === 1) {
      const next = sortedDays.find((day) => day >= from);
      if (next !== undefined) candidates.push(next);
      for (const [start, end] of intervals) {
        if (end >= from) {
          candidates.push(Math.max(start, from));
          break;
        }
      }
    } else {
      for (let index = sortedDays.length - 1; index >= 0; index -= 1) {
        if ((sortedDays[index] as number) <= from) {
          candidates.push(sortedDays[index] as number);
          break;
        }
      }
      for (let index = intervals.length - 1; index >= 0; index -= 1) {
        const [start, end] = intervals[index] as Interval;
        if (start <= from) {
          candidates.push(Math.min(end, from));
          break;
        }
      }
    }
    const inBounds = candidates.filter(
      (day) => day >= MIN_DAY && day <= MAX_DAY,
    );
    if (inBounds.length === 0) {
      return null;
    }
    return direction === 1 ? Math.min(...inBounds) : Math.max(...inBounds);
  };

  return {
    isAvailable: (date) => available(toEpochDay(date)),
    nextAvailable: (date, direction) => {
      const found = search(toEpochDay(date) + direction, direction);
      return found === null ? null : fromEpochDay(found);
    },
  };
}
