import type { PlainTime } from "../foundation/index.js";

/** A wall-clock time of an unspecified day, or `null` when empty (plan 07 T1). */
export type TimeValue = PlainTime | null;

/** Half-open `[start, end)`. `{ start, end: null }` is the partial state while picking. */
export type TimeRangeValue = {
  start: PlainTime | null;
  end: PlainTime | null;
} | null;

export type TimeGranularity = "hour" | "minute" | "second";
export type HourCycle = "h12" | "h23";
export type TimePartName = "hour" | "minute" | "second" | "dayPeriod";
