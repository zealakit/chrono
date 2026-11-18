import {
  type Availability,
  type AvailabilityRule,
  type AvailabilitySpec,
  type DateTimeInput,
  type DateInput,
  compileAvailability,
  toPlainDate,
  toPlainDateTime,
} from "../foundation/index.js";
import type { CalendarEventInput } from "./events/types.js";
import type { EventId } from "./events/types.js";

/**
 * Context passed to the Calendar `availability` function option (plan 11 R6).
 * `excludeEventId` is set while a drag/resize previews, so an event never
 * blocks its own new position.
 */
export type AvailabilityContext = {
  excludeEventId?: EventId;
};

/** What the Calendar `availability` option accepts (plan 11 V4, R6, R7). */
export type CalendarAvailabilityInput =
  | AvailabilitySpec
  | Availability
  | ((context: AvailabilityContext) => AvailabilitySpec | Availability);

export type AvailabilityFromEventsOptions = {
  /** Only events shown in this resource block time. */
  resourceId?: string | number;
  /** Leave this event out (the one being moved). */
  excludeId?: EventId;
  /**
   * The zone event strings and `Date`s are read in. Needed when events carry an
   * offset or `Z`; the returned spec's `timeZone` is set to it, so the rules are
   * the wall times the calendar shows. Without it, the written wall time is used.
   */
  timeZone?: string;
  /** Customise the rule reason shown by `getAvailabilityLabel`. */
  reason?: (event: CalendarEventInput) => string | undefined;
};

const pad = (value: number): string => String(value).padStart(2, "0");

/** The wall-clock ISO form of a date or date-time value, without a zone suffix. */
export function wallIso(
  value: DateTimeInput | DateInput,
  timeZone?: string,
  allDay?: boolean,
): string {
  if (timeZone !== undefined || allDay) {
    const zone = timeZone ?? "UTC";
    if (allDay) {
      return wallIso(toPlainDate(value as DateInput, zone));
    }
    return wallIso(toPlainDateTime(value as DateTimeInput, zone));
  }
  if (typeof value === "object" && !("year" in value)) {
    // A `Date`: read through the foundation (UTC), never the host zone.
    return wallIso(toPlainDate(value as DateInput, "UTC"));
  }
  if (typeof value === "string") {
    const match = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}(?::\d{2})?))?/.exec(
      value,
    );
    if (match) {
      return match[2] ? `${match[1]}T${match[2]}` : match[1];
    }
    return value;
  }
  const date = `${value.year}-${pad(value.month)}-${pad(value.day)}`;
  if ("hour" in value) {
    return `${date}T${pad(value.hour)}:${pad(value.minute)}:${pad(value.second)}`;
  }
  return date;
}

function eventResourceMatch(
  event: CalendarEventInput,
  resourceId: string | number | undefined,
): boolean {
  if (resourceId === undefined) {
    return true;
  }
  const value = event.resourceId;
  if (value === undefined) {
    return true;
  }
  return Array.isArray(value)
    ? value.includes(resourceId)
    : value === resourceId;
}

/**
 * Turn bookings into `blocked` rules (plan 11 V11). All-day events run
 * `[start, end)` on dates; timed events on wall times. Pass `excludeId` while
 * dragging so the moved event does not block itself (R6).
 */
export function availabilityFromEvents(
  events: readonly CalendarEventInput[],
  options: AvailabilityFromEventsOptions = {},
): AvailabilitySpec {
  const rules: AvailabilityRule[] = [];
  for (const event of events) {
    if (options.excludeId !== undefined && event.id === options.excludeId) {
      continue;
    }
    if (!eventResourceMatch(event, options.resourceId)) {
      continue;
    }
    rules.push({
      type: "range",
      start: wallIso(event.start, options.timeZone, event.allDay),
      end: wallIso(event.end, options.timeZone, event.allDay),
      id: String(event.id),
      reason: options.reason?.(event),
      data: event,
    });
  }
  return options.timeZone === undefined
    ? { blocked: rules }
    : { blocked: rules, timeZone: options.timeZone };
}

export function resolveCalendarAvailability(
  input: CalendarAvailabilityInput | undefined,
  context: AvailabilityContext,
  options: { timeZone?: string; now?: number } = {},
): Availability | undefined {
  if (input === undefined) {
    return undefined;
  }
  const value = typeof input === "function" ? input(context) : input;
  return compileAvailability(value, options);
}
