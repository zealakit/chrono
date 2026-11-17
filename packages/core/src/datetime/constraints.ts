import {
  type DateTimeInput,
  type PlainDate,
  type PlainDateTime,
  type PlainTime,
  type ZonedDateTime,
  compare,
  isSameDay,
  nowZoned,
  plainDateTime,
  plainTime,
  toEpochDay,
  toInstant,
  toPlainDateTime,
  toSecondOfDay,
} from "../foundation/index.js";

export type BoundsOptions = {
  min?: DateTimeInput;
  max?: DateTimeInput;
  /** `min` becomes now in `timeZone` (plan 08 X5). */
  disablePast?: boolean;
  /** The display zone; plain values are read in it, zoned ones converted to it. */
  timeZone?: string;
  now?: number;
};

/** Wall-time bounds in the display zone. Both ends are inclusive. */
export type Bounds = { min?: PlainDateTime; max?: PlainDateTime };

const wallOf = (value: PlainDateTime | ZonedDateTime): number =>
  toEpochDay(value) * 86400 + toSecondOfDay(value);

export function getBounds(options: BoundsOptions): Bounds {
  const zone = options.timeZone ?? "UTC";
  let min =
    options.min === undefined ? undefined : toPlainDateTime(options.min, zone);
  const max =
    options.max === undefined ? undefined : toPlainDateTime(options.max, zone);
  if (options.disablePast) {
    const now = nowZoned(zone, options.now);
    const wall = plainDateTime(
      now,
      plainTime(now.hour, now.minute, now.second),
    );
    if (!min || wallOf(wall) > wallOf(min)) min = wall;
  }
  return { min, max };
}

/** A day outside `[min.day, max.day]` is disabled; boundary days stay enabled. */
export function isDayDisabled(date: PlainDate, bounds: Bounds): boolean {
  return (
    (bounds.min !== undefined && compare(date, bounds.min) < 0) ||
    (bounds.max !== undefined && compare(date, bounds.max) > 0)
  );
}

/** On the boundary days only the times past `min` / before `max` are allowed. */
export function timeBoundsFor(
  date: PlainDate,
  bounds: Bounds,
): { min?: PlainTime; max?: PlainTime } {
  const result: { min?: PlainTime; max?: PlainTime } = {};
  if (bounds.min && isSameDay(date, bounds.min)) {
    result.min = plainTime(
      bounds.min.hour,
      bounds.min.minute,
      bounds.min.second,
    );
  }
  if (bounds.max && isSameDay(date, bounds.max)) {
    result.max = plainTime(
      bounds.max.hour,
      bounds.max.minute,
      bounds.max.second,
    );
  }
  return result;
}

export type DateTimeRangeReason =
  | "start-invalid"
  | "end-invalid"
  | "end-before-start"
  | "too-short"
  | "too-long";

export type DateTimeRangeCheck =
  | { valid: true; duration: number }
  | { valid: false; reason: DateTimeRangeReason };

export type DateTimeRangeLimits = {
  /** Minutes. */
  minDuration?: number;
  maxDuration?: number;
  bounds?: Bounds;
};

/**
 * Check a half-open date-time range. Zoned values compare as instants, plain ones as
 * wall times. `duration` is in minutes.
 */
export function checkDateTimeRange(
  start: PlainDateTime | ZonedDateTime,
  end: PlainDateTime | ZonedDateTime,
  limits: DateTimeRangeLimits = {},
): DateTimeRangeCheck {
  const seconds = (value: PlainDateTime | ZonedDateTime): number =>
    "timeZone" in value ? Math.round(toInstant(value) / 1000) : wallOf(value);
  const from = seconds(start);
  const to = seconds(end);
  const { min, max } = limits.bounds ?? {};
  if (min && wallOf(plainDateTime(start, start)) < wallOf(min)) {
    return { valid: false, reason: "start-invalid" };
  }
  if (max && wallOf(plainDateTime(end, end)) > wallOf(max)) {
    return { valid: false, reason: "end-invalid" };
  }
  if (to <= from) return { valid: false, reason: "end-before-start" };
  const duration = Math.round((to - from) / 60);
  if (limits.minDuration !== undefined && duration < limits.minDuration) {
    return { valid: false, reason: "too-short" };
  }
  if (limits.maxDuration !== undefined && duration > limits.maxDuration) {
    return { valid: false, reason: "too-long" };
  }
  return { valid: true, duration };
}
