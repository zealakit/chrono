"use client";

import { createContext, useContext } from "react";
import type { TimeInputPropGetters } from "./use-time-input.js";
import type { TimePanelPropGetters } from "./use-time-panel.js";

export type TimePanelContextValue = TimePanelPropGetters;
export type TimeFieldContextValue = Pick<
  TimeInputPropGetters,
  | "state"
  | "controller"
  | "getSegmentProps"
  | "getTextFieldProps"
  | "getClearButtonProps"
>;

export const TimePanelContext = createContext<TimePanelContextValue | null>(
  null,
);
export const TimeFieldContext = createContext<TimeFieldContextValue | null>(
  null,
);

/** Internal: parts read their panel from the nearest panel root (no global Provider). */
export function useTimePanelContext(part: string): TimePanelContextValue {
  const value = useContext(TimePanelContext);
  if (!value) {
    throw new Error(
      `[chrono-react] <${part}> must be used inside <TimePanel> or <TimeRangePanel>.`,
    );
  }
  return value;
}

export function useTimeFieldContext(part: string): TimeFieldContextValue {
  const value = useContext(TimeFieldContext);
  if (!value) {
    throw new Error(
      `[chrono-react] <${part}> must be used inside <TimeInput> or a <TimeRangeInput> field.`,
    );
  }
  return value;
}
