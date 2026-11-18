import type {
  DateInput,
  DateTimeInput,
  PlainDate,
  PlainDateTime,
  ZonedDateTime,
} from "../../foundation/index.js";

/** An event id: a string or a number (plan 05 E1). */
export type EventId = string | number;

/**
 * The month grid structure the event layout reads: per month, per week row,
 * the visible days in column order. `MonthLayout` (the controller's state)
 * satisfies this shape.
 */
export type MonthEventLayout = {
  months: {
    weeks: {
      days: {
        date: PlainDate;
        hidden: boolean;
        outsideMonth: boolean;
        /** ISO date, the cell's `data-chrono-key`. */
        key: string;
      }[];
    }[];
  }[];
};

/**
 * What the app passes for one event (plan 05 E1). The app's own fields pass
 * through untouched on the original object; Chrono only reads these keys.
 */
export type CalendarEventInput = {
  id: EventId;
  /** `DateTimeInput` when timed, `DateInput` when `allDay`. */
  start: DateTimeInput | DateInput;
  end: DateTimeInput | DateInput;
  allDay?: boolean;
  recurringId?: string | number;
  calendarId?: string | number;
  /** Resource(s) the event belongs to, for resource views (plan 10 R2). */
  resourceId?: EventId | readonly EventId[];
  /** Per-event edit permissions (plan 09 M1); `false` wins over the calendar option. */
  editable?: boolean;
  movable?: boolean;
  resizable?: boolean;
};

/**
 * An event after parsing and zone conversion (plan 05 §2.2). `start`/`end` are
 * wall time in the display zone, half-open `[start, end)`; all-day events run
 * from midnight of the first day to midnight of the exclusive end day (E3).
 * `key` is the unique internal id (dedupe suffix on repeated ids).
 */
export type NormalizedEvent<
  TEvent extends CalendarEventInput = CalendarEventInput,
> = {
  id: EventId;
  key: string;
  /** The app's original object, unchanged. */
  event: TEvent;
  start: PlainDateTime;
  end: PlainDateTime;
  allDay: boolean;
  recurringId?: string | number;
  calendarId?: string | number;
  /** Resource ids the event is shown in (empty or missing outside resource views). */
  resourceIds?: readonly EventId[];
};

/** Fields every layout segment shares (plan 05 §2.2). */
export type EventSegmentBase<
  TEvent extends CalendarEventInput = CalendarEventInput,
> = {
  /** `${normalized.key}:${firstDayKey}` — unique per segment. */
  key: string;
  event: TEvent;
  /** Real values in the display zone (not clipped to the segment). */
  start: PlainDateTime;
  end: PlainDateTime;
  allDay: boolean;
  continuesBefore: boolean;
  continuesAfter: boolean;
  /** The whole event ended before `now`. */
  past: boolean;
};

/** A piece of an event in the month view (plan 05 §2.2). */
export type MonthSegment<
  TEvent extends CalendarEventInput = CalendarEventInput,
> = EventSegmentBase<TEvent> & {
  /** Index into the month layout's `months`. */
  month: number;
  /** Index into that month's `weeks`. */
  week: number;
  /** First visible column the piece occupies. */
  startColumn: number;
  /** Number of visible columns it occupies. */
  days: number;
  lane: number;
  hidden: boolean;
};

/** A piece of an event in a time-grid day (plan 05 §2.2). */
export type TimeGridSegment<
  TEvent extends CalendarEventInput = CalendarEventInput,
> = EventSegmentBase<TEvent> & {
  dayKey: string;
  /** Fractions 0–1 of the visible axis. */
  top: number;
  height: number;
  column: number;
  columns: number;
  span: number;
};

/** A piece of an event in the time-grid all-day row (plan 05 §2.4). */
export type AllDayRowSegment<
  TEvent extends CalendarEventInput = CalendarEventInput,
> = EventSegmentBase<TEvent> & {
  /** ISO date of the first covered day. */
  dayKey: string;
  startColumn: number;
  days: number;
  lane: number;
  hidden: boolean;
};

/** One event of one agenda day (plan 05 §2.2). */
export type AgendaItem<TEvent extends CalendarEventInput = CalendarEventInput> =
  EventSegmentBase<TEvent> & {
    dayKey: string;
  };

/** A proposed range creation (plan 05 E14, §2.6). */
export type SelectionProposal = {
  kind: "create";
  start: PlainDateTime | ZonedDateTime | PlainDate;
  end: PlainDateTime | ZonedDateTime | PlainDate;
  allDay: boolean;
  source: "pointer" | "keyboard";
};

/** The segments of the active layout (plan 05 §2.6). */
export type CalendarEvents<
  TEvent extends CalendarEventInput = CalendarEventInput,
> = MonthSegment<TEvent>[] | TimeGridSegment<TEvent>[] | AgendaItem<TEvent>[];
