import { addDays, dayOfWeek, toEpochDay } from "../values/plain-date.js";
import { SECONDS_PER_DAY } from "../values/plain-time.js";
import { fromSecondOfDay } from "../values/plain-time.js";
import { plainDateTime } from "../values/plain-date-time.js";
import { parseIsoDate } from "../values/iso.js";
import { toInstant, toZoned } from "../values/zoned.js";
import type { DayOfWeek, PlainDate } from "../values/types.js";

/** Fields every rule may carry (plan 11 V2). */
export type AvailabilityRuleMeta = {
  id?: string;
  /** Human wording for "why" (plan 11 V12). */
  reason?: string;
  /** App data; never serialized into the DOM (plan 11 R7). */
  data?: unknown;
  resourceId?: string | readonly string[];
};

export type DailyAvailabilityRule = AvailabilityRuleMeta & {
  type: "daily";
  /** `"09:00"` or `"09:00:00"`; `"24:00"` is allowed for `end`. */
  start: string;
  end: string;
};

export type WeeklyAvailabilityRule = AvailabilityRuleMeta & {
  type: "weekly";
  days: readonly DayOfWeek[];
  /** Defaults to `"00:00"`. */
  start?: string;
  /** Defaults to `"24:00"` (the whole day). */
  end?: string;
};

export type DatesAvailabilityRule = AvailabilityRuleMeta & {
  type: "dates";
  dates: readonly (PlainDate | string)[];
  start?: string;
  end?: string;
};

export type RangeAvailabilityRule = AvailabilityRuleMeta & {
  type: "range";
  /** A date (whole days, half-open) or a date-time (half-open over wall time). */
  start: PlainDate | string;
  end: PlainDate | string;
};

export type AvailabilityRule =
  | DailyAvailabilityRule
  | WeeklyAvailabilityRule
  | DatesAvailabilityRule
  | RangeAvailabilityRule;

/** A rule whose `dates` are already `PlainDate` values. */
export type NormalizedAvailabilityRule =
  | Exclude<AvailabilityRule, DatesAvailabilityRule>
  | (Omit<DatesAvailabilityRule, "dates"> & { dates: readonly PlainDate[] });

const TIME_TOKEN = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

/** Seconds since local midnight for a `"HH:mm"` or `"HH:mm:ss"` token. `"24:00"` is 86400. */
export function timeTokenToSeconds(token: string): number {
  const match = TIME_TOKEN.exec(token.trim());
  if (!match) {
    throw new RangeError(`Invalid time "${token}": expected "HH:mm".`);
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] ?? 0);
  if (hour === 24 && minute === 0 && second === 0) {
    return SECONDS_PER_DAY;
  }
  if (hour > 23 || minute > 59 || second > 59) {
    throw new RangeError(`Invalid time "${token}": out of range.`);
  }
  return hour * 3600 + minute * 60 + second;
}

/** Normalize `dates` (strings or values) once, at compile time. */
export function normalizeRule(
  rule: AvailabilityRule,
): NormalizedAvailabilityRule {
  if (rule.type === "dates") {
    return {
      ...rule,
      dates: rule.dates.map((date) =>
        typeof date === "string" ? parseIsoDate(date) : date,
      ),
    };
  }
  return rule;
}

/** Whether a rule applies to `resourceId` (rules without one apply to everything). */
export function ruleMatchesResource(
  rule: AvailabilityRule,
  resourceId: string | undefined,
): boolean {
  const target = rule.resourceId;
  if (target === undefined) {
    return true;
  }
  if (resourceId === undefined) {
    return false;
  }
  return typeof target === "string"
    ? target === resourceId
    : target.includes(resourceId);
}

/** The wall-time window of a day-scoped rule on `day`, as instants in `zone`. */
export function expandRuleDay(
  rule: Exclude<AvailabilityRule, RangeAvailabilityRule>,
  day: PlainDate,
  zone: string,
): { start: number; end: number } {
  if (rule.type === "weekly" && !rule.days.includes(dayOfWeek(day))) {
    return { start: 0, end: 0 };
  }
  if (
    rule.type === "dates" &&
    !(rule.dates as readonly PlainDate[]).some(
      (value) => toEpochDay(value) === toEpochDay(day),
    )
  ) {
    return { start: 0, end: 0 };
  }
  const startSeconds =
    rule.start === undefined ? 0 : timeTokenToSeconds(rule.start);
  const rawEnd =
    rule.end === undefined ? SECONDS_PER_DAY : timeTokenToSeconds(rule.end);
  if (rawEnd === startSeconds) {
    throw new RangeError(
      `Availability ${rule.type} rule start and end are equal ("${rule.start}").`,
    );
  }
  const endDay =
    rawEnd >= SECONDS_PER_DAY || rawEnd < startSeconds ? addDays(day, 1) : day;
  const start = toInstant(
    toZoned(
      plainDateTime(day, fromSecondOfDay(startSeconds)),
      zone,
      "compatible",
    ),
  );
  const end = toInstant(
    toZoned(
      plainDateTime(endDay, fromSecondOfDay(rawEnd % SECONDS_PER_DAY)),
      zone,
      "compatible",
    ),
  );
  return { start, end };
}
