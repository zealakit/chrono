import {
  type DateConstraints,
  type PlainDate,
  compare,
  eachDay,
  getDateStatus,
  isSameDay,
} from "../../foundation/index.js";
import type { MultiDateValue } from "../types.js";

export const sortUnique = (dates: readonly PlainDate[]): PlainDate[] => {
  const sorted = [...dates].sort(compare);
  return sorted.filter(
    (date, index) =>
      index === 0 || !isSameDay(date, sorted[index - 1] as PlainDate),
  );
};

/** Toggle one day. A full selection (`maxSelected`) still lets a day be removed. */
export function toggleDate(
  value: MultiDateValue,
  date: PlainDate,
  constraints: DateConstraints,
  maxSelected?: number,
): MultiDateValue {
  if (value.some((item) => isSameDay(item, date))) {
    return value.filter((item) => !isSameDay(item, date));
  }
  if (!getDateStatus(date, constraints).selectable) return value;
  if (maxSelected !== undefined && value.length >= maxSelected) return value;
  return sortUnique([...value, date]);
}

/** Add every selectable day between `from` and `to` (either direction), stopping at `maxSelected`. */
export function addBetween(
  value: MultiDateValue,
  from: PlainDate,
  to: PlainDate,
  constraints: DateConstraints,
  maxSelected?: number,
): MultiDateValue {
  const range =
    compare(from, to) <= 0
      ? { start: from, end: to }
      : { start: to, end: from };
  const next = [...value];
  for (const day of eachDay(range)) {
    if (maxSelected !== undefined && next.length >= maxSelected) break;
    if (
      getDateStatus(day, constraints).selectable &&
      !next.some((item) => isSameDay(item, day))
    ) {
      next.push(day);
    }
  }
  return sortUnique(next);
}
