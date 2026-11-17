"use client";

import { createContext, useContext } from "react";
import type { DateTimeInputPropGetters } from "./use-datetime-input.js";
import type {
  DateTimePanelPropGetters,
  DateTimeRangePanelPropGetters,
} from "./use-datetime-panel.js";

export type DateTimePanelContextValue =
  | DateTimePanelPropGetters
  | DateTimeRangePanelPropGetters;
export type DateTimeFieldContextValue = Pick<
  DateTimeInputPropGetters,
  | "state"
  | "controller"
  | "getSegmentProps"
  | "getDateFieldProps"
  | "getTimeFieldProps"
  | "getClearButtonProps"
>;

export const DateTimePanelContext =
  createContext<DateTimePanelContextValue | null>(null);
export const DateTimeFieldContext =
  createContext<DateTimeFieldContextValue | null>(null);

export function useDateTimePanelContext(
  part: string,
): DateTimePanelContextValue {
  const value = useContext(DateTimePanelContext);
  if (!value) {
    throw new Error(
      `[chrono-react] <${part}> must be used inside <DateTimePanel> or <DateTimeRangePanel>.`,
    );
  }
  return value;
}

export function useDateTimeFieldContext(
  part: string,
): DateTimeFieldContextValue {
  const value = useContext(DateTimeFieldContext);
  if (!value) {
    throw new Error(
      `[chrono-react] <${part}> must be used inside <DateTimeInput> or a <DateTimeRangeInput> field.`,
    );
  }
  return value;
}
