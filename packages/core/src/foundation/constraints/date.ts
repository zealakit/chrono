import { compare } from "../values/compare.js";
import type { PlainDate } from "../values/types.js";

export type DateConstraints = {
  min?: PlainDate;
  max?: PlainDate;
  isDateDisabled?: (date: PlainDate) => boolean;
  isDateUnavailable?: (date: PlainDate) => boolean;
};

export type DateStatusReason =
  | "before-min"
  | "after-max"
  | "disabled"
  | "unavailable";

/**
 * `disabled` and `unavailable` are separate statuses with the same
 * selectability (D14). Both stay focusable.
 */
export type DateStatus = {
  selectable: boolean;
  disabled: boolean;
  unavailable: boolean;
  reason?: DateStatusReason;
};

/** Order: min, max, `isDateDisabled`, `isDateUnavailable`. The first hit wins. */
export function getDateStatus(
  date: PlainDate,
  constraints: DateConstraints = {},
): DateStatus {
  const { min, max, isDateDisabled, isDateUnavailable } = constraints;
  if (min && compare(date, min) < 0) {
    return {
      selectable: false,
      disabled: true,
      unavailable: false,
      reason: "before-min",
    };
  }
  if (max && compare(date, max) > 0) {
    return {
      selectable: false,
      disabled: true,
      unavailable: false,
      reason: "after-max",
    };
  }
  if (isDateDisabled?.(date)) {
    return {
      selectable: false,
      disabled: true,
      unavailable: false,
      reason: "disabled",
    };
  }
  if (isDateUnavailable?.(date)) {
    return {
      selectable: false,
      disabled: false,
      unavailable: true,
      reason: "unavailable",
    };
  }
  return { selectable: true, disabled: false, unavailable: false };
}

export function isDateSelectable(
  date: PlainDate,
  constraints: DateConstraints = {},
): boolean {
  return getDateStatus(date, constraints).selectable;
}
