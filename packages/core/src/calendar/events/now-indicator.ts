import {
  type PlainDate,
  type PlainDateTime,
  type PlainTime,
  plainDate,
  toIsoString,
  toSecondOfDay,
} from "../../foundation/index.js";

export type NowIndicator = { dayKey: string; top: number };

export type NowIndicatorDay = { date: PlainDate; key: string };

/**
 * The now-indicator position (plan 05 §2.4 step 4): `{ dayKey, top }` when the
 * current time falls inside a visible day and the time axis, else `null`.
 * `top` is a fraction 0–1 of the axis `[dayStart, dayEnd)`.
 */
export function getNowIndicator(
  now: PlainDateTime,
  days: readonly NowIndicatorDay[],
  options: { dayStart?: PlainTime; dayEnd?: PlainTime } = {},
): NowIndicator | null {
  const axisStart = options.dayStart ? toSecondOfDay(options.dayStart) : 0;
  const axisEnd = options.dayEnd ? toSecondOfDay(options.dayEnd) : 86400;
  const dayKey = toIsoString(plainDate(now.year, now.month, now.day));
  if (!days.some((day) => day.key === dayKey)) {
    return null;
  }
  const second = toSecondOfDay(now);
  if (second < axisStart || second >= axisEnd) {
    return null;
  }
  return { dayKey, top: (second - axisStart) / (axisEnd - axisStart) };
}
