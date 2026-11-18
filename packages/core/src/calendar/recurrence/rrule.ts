import {
  type DayOfWeek,
  type PlainDateTime,
  type ZonedDateTime,
  fromInstant,
  isValidDate,
  plainDate,
  plainDateTime,
  plainTime,
  toInstant,
  toZoned,
} from "../../foundation/index.js";
import {
  type RRule,
  type RRuleByDay,
  type RRuleFreq,
  type RRuleUntil,
  rruleError,
} from "./rrule-types.js";

const FREQS: readonly RRuleFreq[] = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"];
const DAY_CODES: readonly string[] = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
const DAY_NUMBERS: Record<string, DayOfWeek> = {
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
  SU: 7,
};
const SUPPORTED = new Set([
  "FREQ",
  "INTERVAL",
  "COUNT",
  "UNTIL",
  "BYDAY",
  "BYMONTHDAY",
  "BYMONTH",
  "WKST",
]);

const pad = (value: number, length = 2): string =>
  String(value).padStart(length, "0");

function isFreq(value: string): value is RRuleFreq {
  return (FREQS as readonly string[]).includes(value);
}

function dayOf(code: string, part: string): DayOfWeek {
  const day = DAY_NUMBERS[code];
  if (day === undefined) {
    throw rruleError("invalid-value", `Unknown weekday "${code}".`, part);
  }
  return day;
}

function isZoned(value: RRuleUntil): value is ZonedDateTime {
  return (value as Partial<ZonedDateTime>).timeZone !== undefined;
}

function isDateTime(value: RRuleUntil): value is PlainDateTime {
  return (value as Partial<PlainDateTime>).hour !== undefined;
}

function parseUntil(value: string): RRuleUntil {
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(
    value,
  );
  if (!match) {
    throw rruleError(
      "invalid-value",
      `UNTIL "${value}" must be YYYYMMDD, YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ.`,
      "UNTIL",
    );
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isValidDate(year, month, day)) {
    throw rruleError(
      "invalid-value",
      `UNTIL "${value}" is not a real date.`,
      "UNTIL",
    );
  }
  if (match[4] === undefined) {
    return plainDate(year, month, day);
  }
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  if (hour > 23 || minute > 59 || second > 59) {
    throw rruleError(
      "invalid-value",
      `UNTIL "${value}" is not a real time.`,
      "UNTIL",
    );
  }
  const wall = plainDateTime(
    plainDate(year, month, day),
    plainTime(hour, minute, second),
  );
  return match[7] === "Z" ? toZoned(wall, "UTC") : wall;
}

function parseNumber(value: string, part: string): number {
  if (!/^[+-]?\d+$/.test(value)) {
    throw rruleError(
      "invalid-value",
      `${part} must be an integer, got "${value}".`,
      part,
    );
  }
  return Number(value);
}

function parseByDay(value: string): RRuleByDay[] {
  return value.split(",").map((entry) => {
    const match = /^([+-]?\d{1,2})?(MO|TU|WE|TH|FR|SA|SU)$/.exec(entry);
    if (!match) {
      throw rruleError(
        "invalid-value",
        `BYDAY entry "${entry}" must be a weekday with an optional ordinal.`,
        "BYDAY",
      );
    }
    const day = dayOf(match[2] as string, "BYDAY");
    if (match[1] === undefined) {
      return { day };
    }
    const ordinal = Number(match[1]);
    if (ordinal === 0 || Math.abs(ordinal) > 53) {
      throw rruleError(
        "invalid-value",
        `BYDAY ordinal "${match[1]}" must be between 1 and 53 or -53 and -1.`,
        "BYDAY",
      );
    }
    return { day, ordinal };
  });
}

function parseString(text: string): RRule {
  const value = text.trim().replace(/^RRULE:/i, "");
  if (value === "") {
    throw rruleError("invalid-value", "An RRULE cannot be empty.", "FREQ");
  }
  const parts = new Map<string, string>();
  for (const entry of value.split(";")) {
    if (entry === "") {
      continue;
    }
    const at = entry.indexOf("=");
    if (at <= 0) {
      throw rruleError(
        "invalid-value",
        `RRULE part "${entry}" must be KEY=VALUE.`,
      );
    }
    const key = entry.slice(0, at).toUpperCase();
    if (!SUPPORTED.has(key)) {
      throw rruleError(
        "unsupported-part",
        `${key} is not supported (plan 12 supports FREQ, INTERVAL, COUNT, UNTIL, BYDAY, BYMONTHDAY, BYMONTH and WKST).`,
        key,
      );
    }
    if (parts.has(key)) {
      throw rruleError("conflict", `${key} appears twice.`, key);
    }
    parts.set(key, entry.slice(at + 1));
  }

  const freqText = parts.get("FREQ");
  if (freqText === undefined) {
    throw rruleError("invalid-value", "RRULE needs FREQ.", "FREQ");
  }
  if (!isFreq(freqText)) {
    throw rruleError(
      "unsupported-part",
      `FREQ=${freqText} is not supported (DAILY, WEEKLY, MONTHLY or YEARLY).`,
      "FREQ",
    );
  }

  const rule: RRule = { freq: freqText };
  const interval = parts.get("INTERVAL");
  if (interval !== undefined) {
    rule.interval = parseNumber(interval, "INTERVAL");
  }
  const count = parts.get("COUNT");
  if (count !== undefined) {
    rule.count = parseNumber(count, "COUNT");
  }
  const until = parts.get("UNTIL");
  if (until !== undefined) {
    rule.until = parseUntil(until);
  }
  const byDay = parts.get("BYDAY");
  if (byDay !== undefined) {
    rule.byDay = parseByDay(byDay);
  }
  const byMonthDay = parts.get("BYMONTHDAY");
  if (byMonthDay !== undefined) {
    rule.byMonthDay = byMonthDay
      .split(",")
      .map((entry) => parseNumber(entry, "BYMONTHDAY"));
  }
  const byMonth = parts.get("BYMONTH");
  if (byMonth !== undefined) {
    rule.byMonth = byMonth
      .split(",")
      .map((entry) => parseNumber(entry, "BYMONTH"));
  }
  const wkst = parts.get("WKST");
  if (wkst !== undefined) {
    rule.wkst = dayOf(wkst, "WKST");
  }
  return parseRRule(rule);
}

function validate(rule: RRule): RRule {
  if (!isFreq(rule.freq)) {
    throw rruleError(
      "unsupported-part",
      `FREQ=${String(rule.freq)} is not supported.`,
      "FREQ",
    );
  }
  if (
    rule.interval !== undefined &&
    (!Number.isInteger(rule.interval) || rule.interval < 1)
  ) {
    throw rruleError(
      "invalid-value",
      "INTERVAL must be a positive integer.",
      "INTERVAL",
    );
  }
  if (rule.count !== undefined) {
    if (!Number.isInteger(rule.count) || rule.count < 1) {
      throw rruleError(
        "invalid-value",
        "COUNT must be a positive integer.",
        "COUNT",
      );
    }
    if (rule.until !== undefined) {
      throw rruleError(
        "conflict",
        "COUNT and UNTIL cannot appear together.",
        "COUNT",
      );
    }
  }
  if (rule.until !== undefined) {
    const until = rule.until as Partial<RRuleUntil>;
    if (!Number.isInteger(until.year) || until.month === undefined) {
      throw rruleError(
        "invalid-value",
        "UNTIL must be a date, a date-time or a UTC date-time.",
        "UNTIL",
      );
    }
  }
  if (rule.byMonth !== undefined) {
    if (rule.byMonth.length === 0) {
      throw rruleError("invalid-value", "BYMONTH cannot be empty.", "BYMONTH");
    }
    for (const month of rule.byMonth) {
      if (!Number.isInteger(month) || month < 1 || month > 12) {
        throw rruleError(
          "invalid-value",
          "BYMONTH values must be 1–12.",
          "BYMONTH",
        );
      }
    }
  }
  if (rule.byMonthDay !== undefined) {
    if (rule.byMonthDay.length === 0) {
      throw rruleError(
        "invalid-value",
        "BYMONTHDAY cannot be empty.",
        "BYMONTHDAY",
      );
    }
    for (const day of rule.byMonthDay) {
      if (!Number.isInteger(day) || day === 0 || Math.abs(day) > 31) {
        throw rruleError(
          "invalid-value",
          "BYMONTHDAY values must be -31…-1 or 1…31.",
          "BYMONTHDAY",
        );
      }
    }
  }
  if (rule.byDay !== undefined) {
    if (rule.byDay.length === 0) {
      throw rruleError("invalid-value", "BYDAY cannot be empty.", "BYDAY");
    }
    for (const entry of rule.byDay) {
      if (
        !Number.isInteger(entry.day) ||
        entry.day < 1 ||
        entry.day > 7 ||
        (entry.ordinal !== undefined &&
          (!Number.isInteger(entry.ordinal) ||
            entry.ordinal === 0 ||
            Math.abs(entry.ordinal) > 53))
      ) {
        throw rruleError("invalid-value", "Invalid BYDAY entry.", "BYDAY");
      }
      if (entry.ordinal === undefined) {
        continue;
      }
      if (rule.freq !== "MONTHLY" && rule.freq !== "YEARLY") {
        throw rruleError(
          "invalid-value",
          "A BYDAY ordinal is only valid with MONTHLY or YEARLY.",
          "BYDAY",
        );
      }
      if (rule.freq === "YEARLY" && rule.byMonth === undefined) {
        throw rruleError(
          "unsupported-part",
          "A YEARLY BYDAY ordinal needs BYMONTH (plan 12 subset).",
          "BYDAY",
        );
      }
    }
  }
  if (
    rule.wkst !== undefined &&
    (!Number.isInteger(rule.wkst) || rule.wkst < 1 || rule.wkst > 7)
  ) {
    throw rruleError("invalid-value", "WKST must be a weekday.", "WKST");
  }

  const copy: RRule = { freq: rule.freq };
  if (rule.interval !== undefined) copy.interval = rule.interval;
  if (rule.count !== undefined) copy.count = rule.count;
  if (rule.until !== undefined) copy.until = rule.until;
  if (rule.byDay !== undefined) {
    copy.byDay = rule.byDay.map((entry) => ({ ...entry }));
  }
  if (rule.byMonthDay !== undefined) copy.byMonthDay = [...rule.byMonthDay];
  if (rule.byMonth !== undefined) copy.byMonth = [...rule.byMonth];
  if (rule.wkst !== undefined) copy.wkst = rule.wkst;
  return copy;
}

/**
 * Parse an RFC 5545 `RRULE` value (with or without the `RRULE:` prefix) or
 * validate a rule object. Unsupported parts throw an {@link RRuleError}.
 */
export function parseRRule(input: string | RRule): RRule {
  return typeof input === "string" ? parseString(input) : validate(input);
}

function untilText(until: RRuleUntil): string {
  const date = `${pad(until.year, 4)}${pad(until.month)}${pad(until.day)}`;
  if (!isDateTime(until)) {
    return date;
  }
  const wall = isZoned(until)
    ? (fromInstant(toInstant(until), "UTC") as ZonedDateTime)
    : until;
  const time = `${pad(wall.hour)}${pad(wall.minute)}${pad(wall.second)}`;
  return `${date}T${time}${isZoned(until) ? "Z" : ""}`;
}

/**
 * Serialize a rule in the fixed part order `FREQ, INTERVAL, COUNT, UNTIL,
 * BYMONTH, BYMONTHDAY, BYDAY, WKST`; `parseRRule(stringifyRRule(rule))` equals
 * `rule`.
 */
export function stringifyRRule(rule: RRule): string {
  const valid = parseRRule(rule);
  const parts: string[] = [`FREQ=${valid.freq}`];
  if (valid.interval !== undefined) parts.push(`INTERVAL=${valid.interval}`);
  if (valid.count !== undefined) parts.push(`COUNT=${valid.count}`);
  if (valid.until !== undefined) parts.push(`UNTIL=${untilText(valid.until)}`);
  if (valid.byMonth !== undefined) {
    parts.push(`BYMONTH=${valid.byMonth.join(",")}`);
  }
  if (valid.byMonthDay !== undefined) {
    parts.push(`BYMONTHDAY=${valid.byMonthDay.join(",")}`);
  }
  if (valid.byDay !== undefined) {
    parts.push(
      `BYDAY=${valid.byDay
        .map(
          (entry) =>
            `${entry.ordinal === undefined ? "" : entry.ordinal}${DAY_CODES[(entry.day - 1) as number]}`,
        )
        .join(",")}`,
    );
  }
  if (valid.wkst !== undefined) {
    parts.push(`WKST=${DAY_CODES[(valid.wkst - 1) as number]}`);
  }
  return parts.join(";");
}
