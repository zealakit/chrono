import { plainDateTime } from "./plain-date-time.js";
import { plainDate } from "./plain-date.js";
import { plainTime } from "./plain-time.js";
import type {
  PlainDate,
  PlainDateTime,
  PlainTime,
  ZonedDateTime,
} from "./types.js";
import {
  fromInstant,
  isValidTimeZone,
  parseOffsetId,
  toInstant,
} from "./zoned.js";

const DATE = "(\\d{4})-(\\d{2})-(\\d{2})";
const TIME = "(\\d{2}):(\\d{2})(?::(\\d{2})(?:[.,]\\d{1,9})?)?";
const DATE_RE = new RegExp(`^${DATE}$`);
const TIME_RE = new RegExp(`^${TIME}$`);
const DATE_TIME_RE = new RegExp(`^${DATE}T${TIME}$`);
const ZONED_RE = new RegExp(
  `^${DATE}T${TIME}(Z|[+-]\\d{2}:\\d{2})(?:\\[([^\\]]+)\\])?$`,
);

function invalid(kind: string, text: string): never {
  throw new RangeError(`"${text}" is not a valid ISO 8601 ${kind}.`);
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}

function dateFrom(match: RegExpExecArray): PlainDate {
  return plainDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

function timeFrom(match: RegExpExecArray, at: number): PlainTime {
  return plainTime(
    Number(match[at]),
    Number(match[at + 1]),
    match[at + 2] === undefined ? 0 : Number(match[at + 2]),
  );
}

/** `YYYY-MM-DD`. Anything else throws a `RangeError`. */
export function parseIsoDate(text: string): PlainDate {
  const match = DATE_RE.exec(text);
  return match ? dateFrom(match) : invalid("date", text);
}

/** `HH:mm`, `HH:mm:ss` (fractional seconds are accepted and dropped, D6). */
export function parseIsoTime(text: string): PlainTime {
  const match = TIME_RE.exec(text);
  return match ? timeFrom(match, 1) : invalid("time", text);
}

/** `YYYY-MM-DDTHH:mm[:ss]`. */
export function parseIsoDateTime(text: string): PlainDateTime {
  const match = DATE_TIME_RE.exec(text);
  return match
    ? plainDateTime(dateFrom(match), timeFrom(match, 4))
    : invalid("date-time", text);
}

function offsetFrom(text: string): number {
  return text === "Z" ? 0 : (parseOffsetId(text) as number);
}

/**
 * `YYYY-MM-DDTHH:mm[:ss]` followed by `Z` or `±hh:mm`, and an optional
 * `[Zone/Id]`. With a zone id the offset must match the zone at that instant.
 */
export function parseIsoZoned(text: string): ZonedDateTime {
  const match = ZONED_RE.exec(text);
  if (!match) {
    return invalid("zoned date-time", text);
  }
  const wall = plainDateTime(dateFrom(match), timeFrom(match, 4));
  const offsetText = match[7] as string;
  const offset = offsetFrom(offsetText);
  if (offsetText !== "Z" && parseOffsetId(offsetText) === null) {
    return invalid("zoned date-time", text);
  }
  const zone = match[8];
  if (zone === undefined) {
    return Object.freeze({
      ...wall,
      timeZone: offsetText === "Z" ? "UTC" : offsetText,
      offset,
    });
  }
  if (!isValidTimeZone(zone)) {
    throw new RangeError(`Unknown time zone "${zone}" in "${text}".`);
  }
  const resolved = fromInstant(
    toInstant({ ...wall, timeZone: zone, offset }),
    zone,
  );
  if (
    resolved.year !== wall.year ||
    resolved.month !== wall.month ||
    resolved.day !== wall.day ||
    resolved.hour !== wall.hour ||
    resolved.minute !== wall.minute ||
    resolved.second !== wall.second
  ) {
    throw new RangeError(
      `Offset in "${text}" does not match time zone ${zone}.`,
    );
  }
  return resolved;
}

function formatOffset(minutes: number): string {
  const abs = Math.abs(minutes);
  return `${minutes < 0 ? "-" : "+"}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** Serialize any plain or zoned value to ISO 8601. */
export function toIsoString(
  value: PlainDate | PlainTime | PlainDateTime | ZonedDateTime,
): string {
  const v = value as Partial<ZonedDateTime>;
  const date =
    v.year === undefined
      ? ""
      : `${pad(v.year, 4)}-${pad(v.month as number)}-${pad(v.day as number)}`;
  const time =
    v.hour === undefined
      ? ""
      : `${pad(v.hour)}:${pad(v.minute as number)}:${pad(v.second as number)}`;
  if (v.timeZone !== undefined) {
    const zone = parseOffsetId(v.timeZone) === null ? `[${v.timeZone}]` : "";
    return `${date}T${time}${formatOffset(v.offset as number)}${zone}`;
  }
  return date && time ? `${date}T${time}` : date || time;
}
