import { compare } from "../values/compare.js";
import { fromEpochDay, toEpochDay } from "../values/plain-date.js";
import { SECONDS_PER_DAY, toSecondOfDay } from "../values/plain-time.js";
import type { PlainTime } from "../values/types.js";
import type { DateRange } from "../ranges/date-range.js";
import { dateRangeLength } from "../ranges/date-range.js";
import type { Availability } from "./availability.js";
import { type DateConstraints, getDateStatus } from "./date.js";
import { type TimeConstraints, getTimeStatus } from "./time.js";

export type DateRangeConstraints = DateConstraints & {
  minDays?: number;
  maxDays?: number;
  allowUnavailableInside?: boolean;
  allowDisabledInside?: boolean;
  /** Extra unavailable days from {@link createAvailability}. */
  availability?: Availability;
};

export type DateRangeReason =
  | "start-invalid"
  | "end-invalid"
  | "too-short"
  | "too-long"
  | "contains-unavailable"
  | "contains-disabled";

export type DateRangeCheck =
  | { valid: true }
  | { valid: false; reason: DateRangeReason };

/**
 * Validate an inclusive date range. Endpoints must be selectable; days
 * between them may be unavailable or disabled only when the matching
 * `allow*Inside` option is set. Only days between the endpoints are scanned.
 */
export function checkDateRange(
  range: DateRange,
  constraints: DateRangeConstraints = {},
): DateRangeCheck {
  const {
    minDays,
    maxDays,
    allowUnavailableInside,
    allowDisabledInside,
    availability,
  } = constraints;
  const isUnavailable = (date: DateRange["start"]): boolean =>
    (constraints.isDateUnavailable?.(date) ?? false) ||
    (availability ? !availability.isAvailable(date) : false);
  const withAvailability: DateConstraints = {
    ...constraints,
    isDateUnavailable: isUnavailable,
  };

  if (!getDateStatus(range.start, withAvailability).selectable) {
    return { valid: false, reason: "start-invalid" };
  }
  if (!getDateStatus(range.end, withAvailability).selectable) {
    return { valid: false, reason: "end-invalid" };
  }
  const length = dateRangeLength(range);
  if (minDays !== undefined && length < minDays) {
    return { valid: false, reason: "too-short" };
  }
  if (maxDays !== undefined && length > maxDays) {
    return { valid: false, reason: "too-long" };
  }
  if (!allowUnavailableInside || !allowDisabledInside) {
    const first = toEpochDay(range.start) + 1;
    const last = toEpochDay(range.end) - 1;
    for (let day = first; day <= last; day += 1) {
      const status = getDateStatus(fromEpochDay(day), withAvailability);
      if (status.unavailable && !allowUnavailableInside) {
        return { valid: false, reason: "contains-unavailable" };
      }
      if (status.disabled && !allowDisabledInside) {
        return { valid: false, reason: "contains-disabled" };
      }
    }
  }
  return { valid: true };
}

export type TimeRangeConstraints = TimeConstraints & {
  /** Seconds. */
  minDuration?: number;
  maxDuration?: number;
  /** An end before the start means the next day. */
  allowOvernight?: boolean;
};

export type TimeRangeReason =
  | "start-invalid"
  | "end-invalid"
  | "too-short"
  | "too-long"
  | "overnight";

export type TimeRangeCheck =
  | { valid: true }
  | { valid: false; reason: TimeRangeReason };

export function checkTimeRange(
  range: { start: PlainTime; end: PlainTime },
  constraints: TimeRangeConstraints = {},
): TimeRangeCheck {
  const { minDuration, maxDuration, allowOvernight } = constraints;
  if (!getTimeStatus(range.start, constraints).selectable) {
    return { valid: false, reason: "start-invalid" };
  }
  if (!getTimeStatus(range.end, constraints).selectable) {
    return { valid: false, reason: "end-invalid" };
  }
  let duration = toSecondOfDay(range.end) - toSecondOfDay(range.start);
  if (compare(range.end, range.start) < 0) {
    if (!allowOvernight) {
      return { valid: false, reason: "overnight" };
    }
    duration += SECONDS_PER_DAY;
  }
  if (minDuration !== undefined && duration < minDuration) {
    return { valid: false, reason: "too-short" };
  }
  if (maxDuration !== undefined && duration > maxDuration) {
    return { valid: false, reason: "too-long" };
  }
  return { valid: true };
}
