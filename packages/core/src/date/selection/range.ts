import {
  type DateRange,
  type DateRangeConstraints,
  type DateRangeReason,
  type PlainDate,
  checkDateRange,
  compare,
  getDateStatus,
} from "../../foundation/index.js";
import type { DateRangeValue } from "../types.js";

/** Range constraints whose day limits may depend on the start (plan 06 A23). */
export type PickConstraints = Omit<
  DateRangeConstraints,
  "minDays" | "maxDays"
> & {
  minDays?: number | ((start: PlainDate) => number);
  maxDays?: number | ((start: PlainDate) => number);
};

export type RangeReason = DateRangeReason | "end-before-start";

export type PickResult =
  | { kind: "draft"; value: { start: PlainDate; end: null } }
  | { kind: "complete"; value: DateRange }
  | { kind: "invalid"; reason: RangeReason };

const resolve = (
  limit: number | ((start: PlainDate) => number) | undefined,
  start: PlainDate,
): number | undefined => (typeof limit === "function" ? limit(start) : limit);

/** Check an ordered range with the limits evaluated for its start. */
export function checkPicked(range: DateRange, constraints: PickConstraints) {
  return checkDateRange(range, {
    ...constraints,
    minDays: resolve(constraints.minDays, range.start),
    maxDays: resolve(constraints.maxDays, range.start),
  });
}

/** The range state machine of plan 06 §13.2. */
export function pickRange(
  value: DateRangeValue,
  date: PlainDate,
  constraints: PickConstraints,
): PickResult {
  const start = value?.start;
  if (!start || value?.end) {
    // idle or complete: the pick always starts a new draft.
    return getDateStatus(date, constraints).selectable
      ? { kind: "draft", value: { start: date, end: null } }
      : { kind: "invalid", reason: "start-invalid" };
  }
  const range: DateRange =
    compare(date, start) < 0
      ? { start: date, end: start }
      : { start, end: date };
  const check = checkPicked(range, constraints);
  return check.valid
    ? { kind: "complete", value: range }
    : { kind: "invalid", reason: check.reason };
}

/** True when `day` cannot end a range that starts at `start` (plan 06 A6). */
export function isBlocked(
  start: PlainDate,
  day: PlainDate,
  constraints: PickConstraints,
): boolean {
  const range: DateRange =
    compare(day, start) < 0 ? { start: day, end: start } : { start, end: day };
  return !checkPicked(range, constraints).valid;
}

/** The previewed range for a draft, or null when the target is blocked. */
export function previewRange(
  start: PlainDate,
  target: PlainDate,
  constraints: PickConstraints,
): DateRange | null {
  const range: DateRange =
    compare(target, start) < 0
      ? { start: target, end: start }
      : { start, end: target };
  return checkPicked(range, constraints).valid ? range : null;
}
