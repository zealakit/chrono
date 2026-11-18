import {
  type DateInput,
  type DateTimeInput,
  type PlainDateTime,
  addDays,
  compare,
  fromEpochDay,
  fromInstant,
  fromSecondOfDay,
  plainDate,
  plainDateTime,
  toEpochDay,
  toInstant,
  toPlainDateTime,
  toSecondOfDay,
  toZoned,
} from "../../foundation/index.js";
import type { EventChangeProposal } from "../controllers/drag-engine.js";
import type { CalendarEventInput, EventId } from "../events/types.js";
import { parseRRule, stringifyRRule } from "./rrule.js";
import { expandRecurrence, recurrenceWall } from "./series.js";
import type { RRule, RRuleUntil } from "./types.js";

const SECONDS_PER_DAY = 86400;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const MIDNIGHT = { hour: 0, minute: 0, second: 0 } as const;

export type RecurrenceScope = "this" | "following" | "all";

/** The override object for a "this occurrence" change; the app assigns its id. */
export type RecurrenceOverride<T extends CalendarEventInput> = Omit<
  T,
  "id" | "rrule" | "exdates" | "rdates"
> & {
  recurringId: EventId;
  recurrenceId: PlainDateTime;
  start: DateTimeInput | DateInput;
  end: DateTimeInput | DateInput;
  allDay: boolean;
};

export type RecurrenceChangeResult<T extends CalendarEventInput> = {
  /** The old series, ended or with new dates. */
  series?: T;
  /** The "this occurrence" replacement. */
  override?: RecurrenceOverride<T>;
  /** The "following occurrences" series; the app assigns its id. */
  newSeries?: Omit<T, "id">;
  /** The series disappeared (`all` delete, or `following` from its first occurrence). */
  removed?: boolean;
  /** Old occurrence start → new start, for stored overrides (RR9). */
  overrideIdMap?: { from: PlainDateTime; to: DateTimeInput | DateInput }[];
};

export type RecurrenceDeleteResult<T extends CalendarEventInput> = {
  series?: T;
  removed?: boolean;
  /** The override row the app should delete for `"this"` (RR9). */
  removedOverrideRecurrenceId?: PlainDateTime;
};

export type ApplyRecurrenceOptions = {
  /** Display zone for overrides and until instants. */
  timeZone?: string;
  /** Stored override starts, shifted by an `"all"` change. */
  overrideStarts?: readonly (DateTimeInput | DateInput)[];
};

const wallSeconds = (value: PlainDateTime): number =>
  toEpochDay(value) * SECONDS_PER_DAY + toSecondOfDay(value);

const fromWallSeconds = (seconds: number): PlainDateTime => {
  const day = Math.floor(seconds / SECONDS_PER_DAY);
  return plainDateTime(
    fromEpochDay(day),
    fromSecondOfDay(seconds - day * SECONDS_PER_DAY),
  );
};

const dateOf = (value: PlainDateTime) =>
  plainDate(value.year, value.month, value.day);

const wall = (
  value: DateTimeInput | DateInput,
  allDay: boolean,
  timeZone: string,
) => recurrenceWall(value, allDay, timeZone);

function isAllDayInput(value: DateTimeInput | DateInput): boolean {
  if (typeof value === "string") {
    return DATE_ONLY.test(value);
  }
  return typeof value === "object" && value !== null && !("hour" in value);
}

function zonedValue(value: DateTimeInput | DateInput): boolean {
  if (typeof value === "string") {
    return /(?:Z|[+-]\d{2}:?\d{2})(?:\[[^\]]+\])?$/.test(value);
  }
  return typeof value === "object" && value !== null && "timeZone" in value;
}

function shiftValue(
  value: DateTimeInput | DateInput,
  allDay: boolean,
  delta: number,
  timeZone: string,
): DateTimeInput | DateInput {
  const start = wall(value, allDay, timeZone);
  const shifted = fromWallSeconds(wallSeconds(start) + delta);
  if (allDay) {
    return dateOf(shifted);
  }
  return zonedValue(value) ? toZoned(shifted, timeZone) : shifted;
}

type SeriesShape = CalendarEventInput & {
  rrule: string | RRule;
  allDay?: boolean;
  exdates?: readonly (DateTimeInput | DateInput)[];
  rdates?: readonly (DateTimeInput | DateInput)[];
};

function ruleOf(series: SeriesShape): RRule {
  return parseRRule(series.rrule);
}

function ruleValue(original: string | RRule, rule: RRule): string | RRule {
  return typeof original === "string" ? stringifyRRule(rule) : rule;
}

function untilBefore(
  occurrenceStart: PlainDateTime,
  allDay: boolean,
  zoned: boolean,
  timeZone: string,
): RRuleUntil {
  if (allDay) {
    return addDays(dateOf(occurrenceStart), -1);
  }
  if (zoned) {
    return fromInstant(
      toInstant(toZoned(occurrenceStart, timeZone)) - 1000,
      "UTC",
    );
  }
  return fromWallSeconds(wallSeconds(occurrenceStart) - 1);
}

/** 0-based index of the edited occurrence within its series. */
function occurrenceIndex(
  series: SeriesShape,
  occurrenceStart: PlainDateTime,
  timeZone: string,
): number {
  const allDay = series.allDay ?? isAllDayInput(series.start);
  const start = wall(series.start, allDay, timeZone);
  const range = {
    start: dateOf(start),
    end: addDays(dateOf(occurrenceStart), 1),
  };
  // EXDATE does not reduce COUNT and RDATE is not counted, so index the bare rule.
  const bare = { ...series, exdates: undefined, rdates: undefined };
  const occurrences = expandRecurrence(bare, range, { timeZone });
  return occurrences.filter((item) => compare(item.start, occurrenceStart) < 0)
    .length;
}

/** End the old series before `occurrenceStart` (COUNT split or UNTIL). */
function splitSeries<T extends CalendarEventInput>(
  series: T,
  occurrenceStart: PlainDateTime,
  timeZone: string,
): { series: T | undefined; index: number } {
  const shape = series as T & SeriesShape;
  const rule = ruleOf(shape);
  const index = occurrenceIndex(shape, occurrenceStart, timeZone);
  if (index === 0) {
    return { series: undefined, index };
  }
  const next: RRule = { ...rule };
  if (rule.count !== undefined) {
    next.count = index;
  } else {
    next.until = untilBefore(
      occurrenceStart,
      shape.allDay ?? isAllDayInput(shape.start),
      zonedValue(shape.start),
      timeZone,
    );
  }
  return {
    series: { ...shape, rrule: ruleValue(shape.rrule, next) },
    index,
  };
}

function omitSeriesFields<T extends CalendarEventInput>(
  value: T,
): Omit<T, "id" | "rrule" | "exdates" | "rdates"> {
  const copy = { ...value } as Record<string, unknown>;
  delete copy.id;
  delete copy.rrule;
  delete copy.exdates;
  delete copy.rdates;
  return copy as Omit<T, "id" | "rrule" | "exdates" | "rdates">;
}

function proposalOccurrence<T extends CalendarEventInput>(
  proposal: EventChangeProposal<T>,
  timeZone: string,
): PlainDateTime {
  if (proposal.recurrence) {
    return proposal.recurrence.occurrenceStart;
  }
  const value = proposal.from.start;
  if (typeof value === "object" && !("hour" in value)) {
    return plainDateTime(value as never, MIDNIGHT);
  }
  return toPlainDateTime(value as DateTimeInput, timeZone);
}

function shiftedList(
  values: readonly (DateTimeInput | DateInput)[] | undefined,
  occurrenceStart: PlainDateTime,
  allDay: boolean,
  delta: number,
  timeZone: string,
): (DateTimeInput | DateInput)[] | undefined {
  if (values === undefined || values.length === 0) {
    return undefined;
  }
  const later = values.filter(
    (value) => compare(wall(value, allDay, timeZone), occurrenceStart) >= 0,
  );
  return later.length > 0
    ? later.map((value) => shiftValue(value, allDay, delta, timeZone))
    : undefined;
}

/**
 * Apply a move or resize to a series (plan 12 RR9). Returns new data; never
 * mutates. Chrono does not choose the scope: the app asks the user and calls
 * this with the answer, then saves the returned objects.
 */
export function applyRecurrenceChange<T extends CalendarEventInput>(
  series: T,
  proposal: EventChangeProposal<T>,
  scope: RecurrenceScope,
  options: ApplyRecurrenceOptions = {},
): RecurrenceChangeResult<T> {
  const timeZone = options.timeZone ?? "UTC";
  const shape = series as T & SeriesShape;
  const occurrenceStart = proposalOccurrence(proposal, timeZone);
  const allDay = proposal.to.allDay;
  const delta =
    wallSeconds(wall(proposal.to.start, allDay, timeZone)) -
    wallSeconds(occurrenceStart);

  if (scope === "this") {
    return {
      override: {
        ...omitSeriesFields(series),
        recurringId:
          (series as { recurringId?: EventId }).recurringId ?? series.id,
        recurrenceId: occurrenceStart,
        start: proposal.to.start,
        end: proposal.to.end,
        allDay,
      } as RecurrenceOverride<T>,
    };
  }

  if (scope === "all") {
    // A resize moves one edge only: the start shifts by `delta`, the end by its own distance.
    const endDelta =
      wallSeconds(wall(proposal.to.end, allDay, timeZone)) -
      wallSeconds(wall(proposal.from.end, allDay, timeZone));
    return {
      series: {
        ...shape,
        start: shiftValue(shape.start, allDay, delta, timeZone),
        end: shiftValue(shape.end, allDay, endDelta, timeZone),
        ...(shape.exdates
          ? {
              exdates: shape.exdates.map((value) =>
                shiftValue(value, allDay, delta, timeZone),
              ),
            }
          : {}),
        ...(shape.rdates
          ? {
              rdates: shape.rdates.map((value) =>
                shiftValue(value, allDay, delta, timeZone),
              ),
            }
          : {}),
      } as T,
      overrideIdMap: (options.overrideStarts ?? []).map((value) => ({
        from: wall(value, allDay, timeZone),
        to: shiftValue(value, allDay, delta, timeZone),
      })),
    };
  }

  const split = splitSeries(series, occurrenceStart, timeZone);
  const rule = ruleOf(shape);
  const nextRule: RRule = { ...rule };
  if (rule.count !== undefined) {
    nextRule.count = rule.count - split.index;
  }
  const exdates = shiftedList(
    shape.exdates,
    occurrenceStart,
    allDay,
    delta,
    timeZone,
  );
  const rdates = shiftedList(
    shape.rdates,
    occurrenceStart,
    allDay,
    delta,
    timeZone,
  );
  const newSeries = {
    ...omitSeriesFields(series),
    start: proposal.to.start,
    end: proposal.to.end,
    allDay,
    rrule: ruleValue(shape.rrule, nextRule),
    ...(exdates ? { exdates } : {}),
    ...(rdates ? { rdates } : {}),
  } as Omit<T, "id">;
  return {
    series: split.series,
    newSeries,
    removed: split.series === undefined,
  };
}

/**
 * Apply a delete to a series (plan 12 RR9): `"this"` adds an EXDATE,
 * `"following"` ends the series, `"all"` removes it.
 */
export function applyRecurrenceDelete<T extends CalendarEventInput>(
  series: T,
  occurrenceStart: PlainDateTime,
  scope: RecurrenceScope,
  options: ApplyRecurrenceOptions = {},
): RecurrenceDeleteResult<T> {
  const timeZone = options.timeZone ?? "UTC";
  if (scope === "all") {
    return { removed: true };
  }
  if (scope === "following") {
    const split = splitSeries(series, occurrenceStart, timeZone);
    return {
      series: split.series,
      removed: split.series === undefined,
    };
  }
  const shape = series as T & SeriesShape;
  return {
    series: {
      ...shape,
      exdates: [...(shape.exdates ?? []), occurrenceStart],
    } as T,
    removedOverrideRecurrenceId: occurrenceStart,
  };
}
