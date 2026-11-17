import {
  type PlainTime,
  type TimeConstraints,
  getTimeStatus,
  toSecondOfDay,
} from "../../foundation/index.js";

export type TimeRangeLimits = TimeConstraints & {
  isTimeUnavailable?: (time: PlainTime) => boolean;
  /** `end <= start` means the next day (a range of 24 h or more cannot be represented). */
  allowOvernight?: boolean;
  /** Minutes. */
  minDuration?: number;
  maxDuration?: number;
};

export type TimeRangeInvalidReason =
  | "start-invalid"
  | "end-before-start"
  | "too-short"
  | "too-long";

export type TimeRangeValueCheck =
  | { valid: true; duration: number; crossesMidnight: boolean }
  | { valid: false; reason: TimeRangeInvalidReason };

const DAY = 86400;

/**
 * Check `[start, end)`. `endSecond` (up to 86400) overrides `end` for a slot that
 * ends at midnight. An `end` of 00:00 after a later start means the end of the day,
 * unless `allowOvernight` (then it is the next midnight, the same thing).
 * `duration` is in minutes.
 */
export function checkTimeRangeValue(
  start: PlainTime,
  end: PlainTime,
  limits: TimeRangeLimits = {},
  endSecond?: number,
): TimeRangeValueCheck {
  const from = toSecondOfDay(start);
  let to = endSecond ?? toSecondOfDay(end);
  if (to === 0 && from > 0) to = DAY;
  let crossesMidnight = false;
  if (to <= from) {
    if (!limits.allowOvernight || to === from) {
      return { valid: false, reason: "end-before-start" };
    }
    to += DAY;
    crossesMidnight = true;
  }
  const { step: _step, ...constraints } = limits;
  if (
    !getTimeStatus(start, { ...constraints, step: limits.step }).selectable ||
    limits.isTimeUnavailable?.(start)
  ) {
    return { valid: false, reason: "start-invalid" };
  }
  const duration = Math.round((to - from) / 60);
  if (limits.minDuration !== undefined && duration < limits.minDuration) {
    return { valid: false, reason: "too-short" };
  }
  if (limits.maxDuration !== undefined && duration > limits.maxDuration) {
    return { valid: false, reason: "too-long" };
  }
  return { valid: true, duration, crossesMidnight };
}
