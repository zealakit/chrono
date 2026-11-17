import {
  type DateConstraints,
  type PlainDate,
  getDateStatus,
} from "../../foundation/index.js";

export type DateValidity =
  | "empty"
  | "incomplete"
  | "invalid-date"
  | "before-min"
  | "after-max"
  | "disabled"
  | "unavailable"
  | "valid";

/** `filled` is how many of the three parts hold a value. */
export function getValidity(
  filled: number,
  date: PlainDate | null,
  constraints: DateConstraints,
): DateValidity {
  if (filled === 0) return "empty";
  if (filled < 3) return "incomplete";
  if (!date) return "invalid-date";
  return getDateStatus(date, constraints).reason ?? "valid";
}

/** A field is invalid when it has content that is not a selectable date. */
export const isInvalid = (validity: string): boolean =>
  validity !== "valid" && validity !== "empty";
