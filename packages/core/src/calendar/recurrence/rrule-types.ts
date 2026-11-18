import type {
  DayOfWeek,
  PlainDate,
  PlainDateTime,
  ZonedDateTime,
} from "../../foundation/index.js";

/** Frequencies the recurrence engine supports (plan 12 RR3). */
export type RRuleFreq = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

/** One `BYDAY` entry: a weekday, optionally the nth of a month (`2TU`, `-1FR`). */
export type RRuleByDay = { day: DayOfWeek; ordinal?: number };

/** `UNTIL` keeps the form it was written in: date, floating date-time or UTC instant. */
export type RRuleUntil = PlainDate | PlainDateTime | ZonedDateTime;

/** The supported RFC 5545 subset (plan 12 RR3). */
export type RRule = {
  freq: RRuleFreq;
  interval?: number;
  count?: number;
  until?: RRuleUntil;
  byDay?: readonly RRuleByDay[];
  /** `-31…-1` and `1…31`. */
  byMonthDay?: readonly number[];
  /** `1…12`. */
  byMonth?: readonly number[];
  wkst?: DayOfWeek;
};

export type RRuleErrorCode =
  | "unsupported-part"
  | "invalid-value"
  | "conflict"
  | "iteration-cap";

/** A rule error carries the failing part so apps can point at it in their editor. */
export type RRuleError = Error & { code: RRuleErrorCode; part?: string };

export function rruleError(
  code: RRuleErrorCode,
  message: string,
  part?: string,
): RRuleError {
  const error = new Error(message) as RRuleError;
  error.code = code;
  if (part !== undefined) {
    error.part = part;
  }
  return error;
}
