import type { PlainDateTime, ZonedDateTime } from "../foundation/index.js";

/**
 * `PlainDateTime` when no `timeZone` is set, `ZonedDateTime` when one is (plan 08 X1).
 * Never a string or a `Date`.
 */
export type DateTimeValueOf<Z> = Z extends string
  ? ZonedDateTime
  : PlainDateTime;
export type DateTimeValue = PlainDateTime | ZonedDateTime | null;

/** Half-open `[start, end)`. */
export type DateTimeRangeValue = {
  start: PlainDateTime | ZonedDateTime | null;
  end: PlainDateTime | ZonedDateTime | null;
} | null;
