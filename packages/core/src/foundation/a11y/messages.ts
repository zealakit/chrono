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
};

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
