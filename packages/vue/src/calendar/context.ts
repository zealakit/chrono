import { type InjectionKey, inject } from "vue";
import type { CalendarComposable } from "./use-calendar.js";
import type { MiniCalendarComposable } from "./use-mini-calendar.js";

export const CalendarKey: InjectionKey<CalendarComposable> =
  Symbol("chrono-calendar");
export const MiniCalendarKey: InjectionKey<MiniCalendarComposable> = Symbol(
  "chrono-mini-calendar",
);

/** Internal: parts read their calendar from the nearest `Calendar` (no global Provider). */
export function useCalendarContext(part: string): CalendarComposable {
  const value = inject(CalendarKey, null);
  if (!value)
    throw new Error(`[chrono-vue] <${part}> must be used inside <Calendar>.`);
  return value;
}

export function useMiniCalendarContext(part: string): MiniCalendarComposable {
  const value = inject(MiniCalendarKey, null);
  if (!value)
    throw new Error(
      `[chrono-vue] <${part}> must be used inside <MiniCalendar>.`,
    );
  return value;
}
