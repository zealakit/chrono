import {
  type PlainDate,
  fold,
  getDatePartOrder,
  getMonthNames,
  isValidDate,
  plainDate,
  toLatinDigits,
  today as readToday,
  tokenize,
} from "../../foundation/index.js";

export type ParseContext = {
  locale?: string;
  today?: PlainDate;
  timeZone?: string;
};
export type ParseResult =
  | { date: PlainDate }
  | { error: "empty" | "unparseable" | "invalid-date" };

/**
 * Resolve a two-digit year to the nearest year within 50 years of `today`.
 * A tie (exactly 50 years either way) goes to the past (plan 06 §13.2).
 */
export function resolveTwoDigitYear(year: number, today: number): number {
  const century = Math.floor(today / 100) * 100;
  let best = century + year;
  for (const candidate of [
    century - 100 + year,
    century + year,
    century + 100 + year,
  ]) {
    const distance = Math.abs(candidate - today);
    const bestDistance = Math.abs(best - today);
    if (
      distance < bestDistance ||
      (distance === bestDistance && candidate < best)
    ) {
      best = candidate;
    }
  }
  return best;
}

function monthFromWord(word: string, locale?: string): number | null {
  const needle = fold(word);
  if (needle.length < 3) return null;
  for (const width of ["long", "short"] as const) {
    const names = getMonthNames(locale, width);
    for (let index = 0; index < names.length; index += 1) {
      if (fold((names[index] as string).replace(/\.$/, "")) === needle) {
        return index + 1;
      }
    }
  }
  return null;
}

type Num = { type: "number"; text: string; value: number };

/**
 * Parse typed text into a date: ISO, the locale's numeric order with any
 * separators, month names (long or short, any case, accents ignored), CJK
 * `2026年11月17日`, and two-digit years.
 */
export function parseDate(
  text: string,
  context: ParseContext = {},
): ParseResult {
  const latin = toLatinDigits(text.trim(), context.locale);
  if (latin === "") return { error: "empty" };
  const todayYear = (context.today ?? readToday(context.timeZone)).year;

  const finish = (
    year: number,
    yearText: string,
    month: number,
    day: number,
  ): ParseResult => {
    const fullYear =
      yearText.length <= 2 ? resolveTwoDigitYear(year, todayYear) : year;
    return isValidDate(fullYear, month, day)
      ? { date: plainDate(fullYear, month, day) }
      : { error: "invalid-date" };
  };

  const tokens = tokenize(latin, context.locale);
  const numbers = tokens.filter(
    (token): token is Num => token.type === "number",
  );
  const words = tokens.filter((token) => token.type === "word");
  const { order } = getDatePartOrder(context.locale);

  if (words.length > 1) return { error: "unparseable" };
  if (words.length === 1) {
    const month = monthFromWord(words[0]?.text ?? "", context.locale);
    if (month === null || numbers.length !== 2) return { error: "unparseable" };
    let first = numbers[0] as Num;
    let second = numbers[1] as Num;
    const rest = order.filter((part) => part !== "month");
    if (
      first.text.length === 4 ||
      (rest[0] === "year" && second.text.length !== 4)
    ) {
      [first, second] = [second, first];
    }
    // `first` is the day, `second` the year.
    return finish(second.value, second.text, month, first.value);
  }

  if (numbers.length !== 3) return { error: "unparseable" };
  const [a, b, c] = numbers as [Num, Num, Num];
  if (a.text.length === 4) return finish(a.value, a.text, b.value, c.value);
  const byPart: Record<string, Num> = {};
  order.forEach((part, index) => {
    byPart[part] = [a, b, c][index] as Num;
  });
  const year = byPart.year as Num;
  return finish(
    year.value,
    year.text,
    (byPart.month as Num).value,
    (byPart.day as Num).value,
  );
}
