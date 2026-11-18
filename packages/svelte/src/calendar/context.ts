import { getContext, setContext } from "svelte";
import type { CalendarApi } from "./use-calendar.js";
import type { MiniCalendarApi } from "./use-mini-calendar.js";

const calendarKey = Symbol("chrono-calendar");
const miniKey = Symbol("chrono-mini-calendar");

export function setCalendarContext(api: CalendarApi): void {
  setContext(calendarKey, api);
}
export function setMiniCalendarContext(api: MiniCalendarApi): void {
  setContext(miniKey, api);
}

/** Internal: parts read their calendar from the nearest `Calendar` (no global Provider). */
export function getCalendarContext(part: string): CalendarApi {
  const value = getContext<CalendarApi | undefined>(calendarKey);
  if (!value)
    throw new Error(
      `[chrono-svelte] <${part}> must be used inside <Calendar>.`,
    );
  return value;
}

export function getMiniCalendarContext(part: string): MiniCalendarApi {
  const value = getContext<MiniCalendarApi | undefined>(miniKey);
  if (!value)
    throw new Error(
      `[chrono-svelte] <${part}> must be used inside <MiniCalendar>.`,
    );
  return value;
}

/** The calendar store from the nearest `<Calendar>` (for example `$state.backgrounds`). */
export function useCalendarState() {
  return getCalendarContext("useCalendarState").state;
}
