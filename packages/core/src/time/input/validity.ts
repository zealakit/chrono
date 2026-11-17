import {
  type PlainTime,
  type TimeConstraints,
  getTimeStatus,
} from "../../foundation/index.js";

export type TimeValidity =
  | "empty"
  | "incomplete"
  | "valid"
  | "before-min"
  | "after-max"
  | "disabled"
  | "unavailable"
  | "off-step";

/** `filled` is how many of the `required` parts hold a value. */
export function getTimeValidity(
  filled: number,
  required: number,
  time: PlainTime | null,
  constraints: TimeConstraints & {
    isTimeUnavailable?: (time: PlainTime) => boolean;
  },
): TimeValidity {
  if (filled === 0) return "empty";
  if (filled < required || !time) return "incomplete";
  const status = getTimeStatus(time, constraints);
  if (!status.selectable) {
    return status.reason === "disabled-range" || status.reason === "disabled"
      ? "disabled"
      : (status.reason as TimeValidity);
  }
  return constraints.isTimeUnavailable?.(time) ? "unavailable" : "valid";
}

export const isTimeInvalid = (validity: string): boolean =>
  validity !== "valid" && validity !== "empty";
