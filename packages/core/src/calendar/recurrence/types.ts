import type { DateRange, PlainDateTime } from "../../foundation/index.js";
import type { CalendarEventInput, RecurrenceInfo } from "../events/types.js";
import type { RRuleError } from "./rrule-types.js";

export type {
  RRule,
  RRuleByDay,
  RRuleError,
  RRuleErrorCode,
  RRuleFreq,
  RRuleUntil,
} from "./rrule-types.js";
export { rruleError } from "./rrule-types.js";
export type { RecurrenceInfo } from "../events/types.js";

/** One expanded occurrence, before layout. */
export type RecurrenceOccurrence<TEvent extends CalendarEventInput> = {
  event: TEvent;
  start: PlainDateTime;
  end: PlainDateTime;
  allDay: boolean;
  key: string;
  recurrence?: RecurrenceInfo<TEvent>;
};

export type RecurrenceErrorHandler = (
  event: CalendarEventInput,
  error: RRuleError,
) => void;

export type RecurrenceExpandOptions = {
  visibleRange: DateRange;
  /** Display zone; the expansion keeps DTSTART's wall time in this zone. */
  timeZone: string;
  /** Called once per series object and error code (plan 12 R5). */
  onRecurrenceError?: RecurrenceErrorHandler;
};

/**
 * The opt-in recurrence pack (plan 12 RR2). A plain value: importing
 * `recurrence` is what loads the engine.
 */
export type RecurrencePack = {
  expand<TEvent extends CalendarEventInput>(
    events: readonly TEvent[],
    options: RecurrenceExpandOptions,
  ): RecurrenceOccurrence<TEvent>[];
};
