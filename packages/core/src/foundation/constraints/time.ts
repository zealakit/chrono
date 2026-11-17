import { compare } from "../values/compare.js";
import {
  SECONDS_PER_DAY,
  fromSecondOfDay,
  toSecondOfDay,
} from "../values/plain-time.js";
import type { PlainTime } from "../values/types.js";

export type TimeStep = { minutes?: number; seconds?: number };

export type TimeConstraints = {
  min?: PlainTime;
  max?: PlainTime;
  step?: TimeStep;
  /** Half-open `[start, end)`. */
  disabledRanges?: readonly { start: PlainTime; end: PlainTime }[];
  isTimeDisabled?: (time: PlainTime) => boolean;
};

export type TimeStatusReason =
  | "before-min"
  | "after-max"
  | "off-step"
  | "disabled-range"
  | "disabled";

export type TimeStatus = { selectable: boolean; reason?: TimeStatusReason };

/** Step length in seconds; `0` when no step is set. */
export function stepToSeconds(step: TimeStep | undefined): number {
  const seconds = (step?.minutes ?? 0) * 60 + (step?.seconds ?? 0);
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new RangeError(
      "Time step must be a positive number of minutes or seconds.",
    );
  }
  return seconds;
}

/** Order: min, max, step alignment (from midnight), disabled ranges, predicate. */
export function getTimeStatus(
  time: PlainTime,
  constraints: TimeConstraints = {},
): TimeStatus {
  const { min, max, step, disabledRanges, isTimeDisabled } = constraints;
  if (min && compare(time, min) < 0) {
    return { selectable: false, reason: "before-min" };
  }
  if (max && compare(time, max) > 0) {
    return { selectable: false, reason: "after-max" };
  }
  const stepSeconds = stepToSeconds(step);
  if (stepSeconds > 0 && toSecondOfDay(time) % stepSeconds !== 0) {
    return { selectable: false, reason: "off-step" };
  }
  for (const range of disabledRanges ?? []) {
    if (compare(time, range.start) >= 0 && compare(time, range.end) < 0) {
      return { selectable: false, reason: "disabled-range" };
    }
  }
  if (isTimeDisabled?.(time)) {
    return { selectable: false, reason: "disabled" };
  }
  return { selectable: true };
}

/**
 * Snap to a multiple of `step` counted from midnight. A result that would
 * reach 24:00 falls back to the last step inside the day.
 */
export function snapTime(
  time: PlainTime,
  step: TimeStep,
  mode: "nearest" | "floor" | "ceil",
): PlainTime {
  const size = stepToSeconds(step);
  if (size === 0) {
    return time;
  }
  const seconds = toSecondOfDay(time);
  const floor = Math.floor(seconds / size) * size;
  let snapped = floor;
  if (mode === "ceil") {
    snapped = floor === seconds ? floor : floor + size;
  } else if (mode === "nearest") {
    snapped = seconds - floor >= size / 2 ? floor + size : floor;
  }
  if (snapped >= SECONDS_PER_DAY) {
    snapped = Math.floor((SECONDS_PER_DAY - 1) / size) * size;
  }
  return fromSecondOfDay(snapped);
}
