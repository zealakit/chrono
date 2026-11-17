import {
  type Disambiguation,
  type PlainDate,
  type PlainDateTime,
  type PlainTime,
  type ZonedDateTime,
  isSameDay,
  isSameTime,
  plainDate,
  plainDateTime,
  plainTime,
  toInstant,
  toPlainDateTime,
} from "../foundation/index.js";
import type { DateTimeValue } from "./types.js";
import { resolveWall, toValueZone } from "./zone/resolve.js";

export type Draft = { date: PlainDate | null; time: PlainTime | null };

export type Zone = {
  timeZone?: string;
  valueTimeZone?: string;
  disambiguation?: Disambiguation;
};

export type Composed = {
  value: PlainDateTime | ZonedDateTime | null;
  adjusted: boolean;
  /** A gap or overlap rejected by `disambiguation: "reject"`. */
  nonexistent: boolean;
};

/** Date and time of a value as the user sees them (in the display zone). */
export function decompose(value: DateTimeValue, zone: Zone): Draft {
  if (!value) return { date: null, time: null };
  const wall = toPlainDateTime(value, zone.timeZone ?? "UTC");
  return {
    date: plainDate(wall.year, wall.month, wall.day),
    time: plainTime(wall.hour, wall.minute, wall.second),
  };
}

/** The value for a date and a time: plain without a `timeZone`, zoned with one. */
export function compose(draft: Draft, zone: Zone): Composed {
  if (!draft.date || !draft.time) {
    return { value: null, adjusted: false, nonexistent: false };
  }
  const wall = plainDateTime(draft.date, draft.time);
  if (zone.timeZone === undefined) {
    return { value: wall, adjusted: false, nonexistent: false };
  }
  try {
    const resolved = resolveWall(wall, zone.timeZone, zone.disambiguation);
    return {
      value: toValueZone(resolved.zoned, zone.valueTimeZone),
      adjusted: resolved.adjusted,
      nonexistent: false,
    };
  } catch (error) {
    if (error instanceof RangeError) {
      return { value: null, adjusted: false, nonexistent: true };
    }
    throw error;
  }
}

const fields = (v: PlainDateTime | ZonedDateTime): string =>
  `${v.year}-${v.month}-${v.day}T${v.hour}:${v.minute}:${v.second}`;

/** Equality: instants for zoned values, wall fields for plain ones. */
export function sameDateTime(a: DateTimeValue, b: DateTimeValue): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if ("timeZone" in a && "timeZone" in b) return toInstant(a) === toInstant(b);
  return fields(a) === fields(b);
}

export const sameDraft = (a: Draft, b: Draft): boolean =>
  (a.date === b.date || (!!a.date && !!b.date && isSameDay(a.date, b.date))) &&
  (a.time === b.time || (!!a.time && !!b.time && isSameTime(a.time, b.time)));
