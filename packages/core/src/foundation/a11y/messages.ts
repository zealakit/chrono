/** Words for states that `Intl` has no names for (D13). Only English ships. */
export type Messages = {
  today: string;
  selected: string;
  unavailable: string;
  disabled: string;
  rangeStart: string;
  rangeEnd: string;
  inRange: string;
  /** Accessible names for calendar controls. */
  previous: string;
  next: string;
  goToToday: string;
  calendar: string;
  /** `{number}` is replaced by the week number. */
  weekNumber: string;
  hasEvents: string;
  /** Event-related (plan 05 §2.6). */
  events: string;
  /** `{count}` is replaced by the number of hidden events. */
  moreEvents: string;
  allDay: string;
  /** `{count}` is replaced by the event count of a cell. */
  cellEvents: string;
  /** `{range}` is replaced by the selected range label. */
  selectionCreated: string;
  selectionCancelled: string;
  eventSelected: string;
  /** Editing events (plan 09). `{event}` and `{range}` are replaced. */
  editInstructions: string;
  moving: string;
  resizing: string;
  movedTo: string;
  resizedTo: string;
  changeCancelled: string;
  notAllowedHere: string;
  /** Date panels and inputs (plan 06). */
  chooseMonth: string;
  chooseYear: string;
  clear: string;
  startDate: string;
  endDate: string;
  /** `{count}` is replaced by the number of selected dates. */
  selectedCount: string;
  placeholderDay: string;
  placeholderMonth: string;
  placeholderYear: string;
  day: string;
  month: string;
  year: string;
  empty: string;
  /** Time inputs and panels (plan 07). */
  placeholderHour: string;
  placeholderMinute: string;
  placeholderSecond: string;
  placeholderDayPeriod: string;
  hour: string;
  minute: string;
  second: string;
  dayPeriod: string;
  startTime: string;
  endTime: string;
  time: string;
  /** Date-time inputs and panels (plan 08). */
  date: string;
  /** The note for a wall time moved by a daylight-saving gap. */
  adjustedTime: string;
  timeZone: string;
  startDateTime: string;
  endDateTime: string;
};

/** The same flat type serves every domain. */
export type TimeMessages = Messages;

export const defaultMessages: Readonly<Messages> = Object.freeze({
  today: "today",
  selected: "selected",
  unavailable: "unavailable",
  disabled: "disabled",
  rangeStart: "range start",
  rangeEnd: "range end",
  inRange: "in range",
  previous: "Previous",
  next: "Next",
  goToToday: "Today",
  calendar: "Calendar",
  weekNumber: "Week {number}",
  hasEvents: "has events",
  events: "events",
  moreEvents: "{count} more events",
  allDay: "All day",
  cellEvents: "{count} events",
  selectionCreated: "Selected {range}",
  selectionCancelled: "Selection cancelled",
  eventSelected: "Event selected",
  editInstructions: "Press M to move, R to resize",
  moving: "Moving {event}, {range}",
  resizing: "Resizing {event}, {range}",
  movedTo: "Moved to {range}",
  resizedTo: "Resized to {range}",
  changeCancelled: "Change cancelled",
  notAllowedHere: "Not allowed here",
  chooseMonth: "Choose month",
  chooseYear: "Choose year",
  clear: "Clear",
  startDate: "Start date",
  endDate: "End date",
  selectedCount: "{count} dates selected",
  placeholderDay: "dd",
  placeholderMonth: "mm",
  placeholderYear: "yyyy",
  day: "Day",
  month: "Month",
  year: "Year",
  empty: "Empty",
  placeholderHour: "hh",
  placeholderMinute: "mm",
  placeholderSecond: "ss",
  placeholderDayPeriod: "--",
  hour: "Hour",
  minute: "Minute",
  second: "Second",
  dayPeriod: "AM/PM",
  startTime: "Start time",
  endTime: "End time",
  time: "Time",
  date: "Date",
  adjustedTime: "adjusted for daylight saving time",
  timeZone: "Time zone",
  startDateTime: "Start date and time",
  endDateTime: "End date and time",
});

/** Replace `{name}` placeholders in a message template. */
export function formatMessage(
  template: string,
  values: Readonly<Record<string, string | number>>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

export function mergeMessages(
  defaults: Readonly<Messages>,
  overrides?: Partial<Messages>,
): Messages {
  const merged: Messages = { ...defaults };
  for (const key of Object.keys(overrides ?? {}) as (keyof Messages)[]) {
    const value = overrides?.[key];
    if (value !== undefined) {
      merged[key] = value;
    }
  }
  return merged;
}
