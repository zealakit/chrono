"use client";

import { createContext, useContext } from "react";
import type { CalendarState } from "@zealakit/chrono-core/calendar";
import type { useCalendar } from "./use-calendar.js";
import type { useMiniCalendar } from "./use-mini-calendar.js";

export type CalendarContextValue = ReturnType<typeof useCalendar>;
export type MiniCalendarContextValue = ReturnType<typeof useMiniCalendar>;

export const CalendarContext = createContext<CalendarContextValue | null>(null);
export const MiniCalendarContext =
  createContext<MiniCalendarContextValue | null>(null);

/** Internal: parts read their calendar from the nearest `Calendar` (no global Provider). */
export function useCalendarContext(part: string): CalendarContextValue {
  const value = useContext(CalendarContext);
  if (!value)
    throw new Error(`[chrono-react] <${part}> must be used inside <Calendar>.`);
  return value;
}

export function useMiniCalendarContext(part: string): MiniCalendarContextValue {
  const value = useContext(MiniCalendarContext);
  if (!value)
    throw new Error(
      `[chrono-react] <${part}> must be used inside <MiniCalendar>.`,
    );
  return value;
}

/** The calendar's state from the nearest `<Calendar>` (for example `state.backgrounds`). */
export function useCalendarState(): CalendarState {
  return useCalendarContext("useCalendarState").state;
}
