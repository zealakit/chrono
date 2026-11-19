"use client";

import { createContext, useContext } from "react";
import type { DateInputPropGetters } from "./use-date-input.js";
import type { DatePanelPropGetters } from "./use-date-panel.js";

export type DatePanelContextValue = DatePanelPropGetters;
export type DateFieldContextValue = Pick<
  DateInputPropGetters,
  | "state"
  | "controller"
  | "getSegmentProps"
  | "getTextFieldProps"
  | "getClearButtonProps"
>;

export const DatePanelContext = createContext<DatePanelContextValue | null>(
  null,
);
export const DateFieldContext = createContext<DateFieldContextValue | null>(
  null,
);

/** Internal: parts read their panel from the nearest panel root (no global Provider). */
export function useDatePanelContext(part: string): DatePanelContextValue {
  const value = useContext(DatePanelContext);
  if (!value) {
    throw new Error(
      `[chrono-react] <${part}> must be used inside <DatePanel>, <DateRangePanel> or <MultiDatePanel>.`,
    );
  }
  return value;
}

export function useDateFieldContext(part: string): DateFieldContextValue {
  const value = useContext(DateFieldContext);
  if (!value) {
    throw new Error(
      `[chrono-react] <${part}> must be used inside <DateInput> or a <DateRangeInput> field.`,
    );
  }
  return value;
}
