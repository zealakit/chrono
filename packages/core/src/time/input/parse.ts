import {
  type PlainTime,
  fold,
  getDayPeriodNames,
  plainTime,
  tokenize,
  toLatinDigits,
} from "../../foundation/index.js";
import type { HourCycle, TimeGranularity } from "../types.js";

export type TimeParseContext = {
  locale?: string;
  hourCycle?: HourCycle;
  granularity?: TimeGranularity;
};
export type TimeParseResult =
  | { time: PlainTime }
  | { error: "empty" | "unparseable" | "invalid" };

const isValidTime = (h: number, m: number, s: number): boolean =>
  h >= 0 && h <= 23 && m >= 0 && m <= 59 && s >= 0 && s <= 59;

const clean = (text: string): string => fold(text).replace(/[.\s]/g, "");

/** `am` / `pm` for a word: the locale's labels, `am`, `pm`, and the first letters `a`, `p`. */
export function dayPeriodOf(word: string, locale?: string): "am" | "pm" | null {
  const needle = clean(word);
  if (!needle) return null;
  const names = getDayPeriodNames(locale);
  if (needle === clean(names.am) || needle === "am" || needle === "a")
    return "am";
  if (needle === clean(names.pm) || needle === "pm" || needle === "p")
    return "pm";
  return null;
}

/**
 * Parse typed text into a time (plan 07 T17): `9`, `930`, `0930`, `9:30`, `9.30`,
 * `9h30`, `21:30`, `9:30 pm`, `9 PM`, the locale's day-period words and `09:30:15`.
 */
export function parseTime(
  text: string,
  context: TimeParseContext = {},
): TimeParseResult {
  const latin = toLatinDigits(text.trim(), context.locale);
  if (latin === "") return { error: "empty" };
  const tokens = tokenize(latin, context.locale);

  let period: "am" | "pm" | null = null;
  const numbers: { text: string; value: number }[] = [];
  let separators = 0;
  for (const token of tokens) {
    if (token.type === "number") {
      numbers.push(token);
    } else if (token.type === "word") {
      if (/^h$/i.test(token.text)) {
        separators += 1;
        continue;
      }
      const found = dayPeriodOf(token.text, context.locale);
      if (!found || period) return { error: "unparseable" };
      period = found;
    } else if (/[:.]/.test(token.text)) {
      separators += 1;
    }
  }
  // A glued day period such as `9pm` is one word token after the number.
  let hour: number;
  let minute = 0;
  let second = 0;
  if (numbers.length === 1 && separators === 0) {
    const digits = (numbers[0] as { text: string }).text;
    if (digits.length <= 2) hour = Number(digits);
    else if (digits.length <= 4) {
      hour = Number(digits.slice(0, -2));
      minute = Number(digits.slice(-2));
    } else if (digits.length <= 6) {
      hour = Number(digits.slice(0, -4));
      minute = Number(digits.slice(-4, -2));
      second = Number(digits.slice(-2));
    } else return { error: "unparseable" };
  } else if (
    numbers.length >= 1 &&
    numbers.length <= 3 &&
    separators >= numbers.length - 1
  ) {
    hour = (numbers[0] as { value: number }).value;
    minute = numbers[1]?.value ?? 0;
    second = numbers[2]?.value ?? 0;
  } else {
    return { error: "unparseable" };
  }
  if (period) {
    if (hour < 1 || hour > 12) return { error: "invalid" };
    hour = (hour % 12) + (period === "pm" ? 12 : 0);
  }
  return isValidTime(hour, minute, second)
    ? { time: plainTime(hour, minute, second) }
    : { error: "invalid" };
}
