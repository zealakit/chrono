import type { DateRange } from "../ranges/date-range.js";
import {
  addDays,
  addMonths,
  fromEpochDay,
  plainDate,
  toEpochDay,
} from "../values/plain-date.js";
import { plainDateTime } from "../values/plain-date-time.js";
import { plainTime } from "../values/plain-time.js";
import { parseIsoDate, parseIsoDateTime } from "../values/iso.js";
import { fromInstant, toInstant, toZoned } from "../values/zoned.js";
import type {
  DayOfWeek,
  PlainDate,
  PlainDateTime,
  PlainTime,
  ZonedDateTime,
} from "../values/types.js";
import {
  type AvailabilityRule,
  type RangeAvailabilityRule,
  expandRuleDay,
  normalizeRule,
  ruleMatchesResource,
  timeTokenToSeconds,
} from "./availability-rules.js";

export type {
  AvailabilityRule,
  AvailabilityRuleMeta,
  DailyAvailabilityRule,
  DatesAvailabilityRule,
  RangeAvailabilityRule,
  WeeklyAvailabilityRule,
} from "./availability-rules.js";

/** Lead time before `now` (plan 11 V13). Fields combine; the latest bound wins. */
export type AvailabilityLeadTime = {
  minutes?: number;
  hours?: number;
  days?: number;
  businessDays?: number;
};

export type AvailabilityBookingWindow = {
  days?: number;
  months?: number;
};

/** The one availability model (plan 11 V1–V5, V13). */
export type AvailabilitySpec = {
  /** Only times inside an `open` rule are available. Without `open`, everything is open. */
  open?: readonly AvailabilityRule[];
  /** Always unavailable; `blocked` wins over `open`. */
  blocked?: readonly AvailabilityRule[];
  /** The zone the rule wall times are written in. */
  timeZone?: string;
  /** Nothing before `now` + lead time is available. Needs `now` at compile time. */
  leadTime?: AvailabilityLeadTime;
  /** Wall time after which "today" no longer counts for `businessDays` lead time. */
  cutoffTime?: string;
  /** Nothing after `now` + the window is available. */
  bookingWindow?: AvailabilityBookingWindow;
};

/** The pre-plan-11 shape, accepted for one minor version (plan 11 R1). */
export type LegacyAvailabilitySpec = {
  dates?: readonly PlainDate[];
  ranges?: readonly DateRange[];
  weekdays?: readonly DayOfWeek[];
  mode: "available" | "blocked";
};

export type AvailabilityStatus = "available" | "partial" | "unavailable";

/** A contiguous piece of `[start, end)` with a status, in epoch milliseconds. */
export type AvailabilityInterval = {
  start: number;
  end: number;
  status: "available" | "unavailable";
  /** The blocked rules overlapping an unavailable piece (lead time is `id: "lead-time"`). */
  rules: readonly AvailabilityRule[];
};

/** The compiled availability model (plan 11 V4, R1, R3). */
export type Availability = {
  /** The zone the spec's wall times are written in (plan 11 V5). */
  readonly timeZone: string;
  readonly spec: AvailabilitySpec;
  /** `"available"` (all potential time is free), `"partial"` (some is blocked), `"unavailable"`. */
  getDayStatus(date: PlainDate, resourceId?: string): AvailabilityStatus;
  /** Contiguous pieces covering exactly `[start, end)` in the display zone. */
  getIntervals(
    start: AvailabilityInput,
    end: AvailabilityInput,
    resourceId?: string,
  ): AvailabilityInterval[];
  isTimeAvailable(
    date: PlainDate,
    time: PlainTime,
    resourceId?: string,
  ): boolean;
  isRangeAvailable(
    start: AvailabilityInput,
    end: AvailabilityInput,
    resourceId?: string,
  ): boolean;
  /** The nearest day strictly after (`1`) or before (`-1`) with some available time. */
  nextAvailable(
    date: PlainDate,
    direction: 1 | -1,
    resourceId?: string,
  ): PlainDate | null;
  /** Legacy: `getDayStatus(date) !== "unavailable"` (plan 11 R1). */
  isAvailable(date: PlainDate): boolean;
};

export type AvailabilityInput =
  | PlainDate
  | PlainDateTime
  | ZonedDateTime
  | string;

export type AvailabilityOptions = {
  /** The display zone; defaults to `spec.timeZone`. */
  timeZone?: string;
  /** The instant "now" for lead time and booking windows (epoch ms). */
  now?: number;
};

const MIN_DAY = -719162; // 0001-01-01
const MAX_DAY = 2932896; // 9999-12-31
const SEARCH_LIMIT = 4000;
const CACHE_DAYS = 400;

type Span = { start: number; end: number; rule?: AvailabilityRule };

const LEAD_TIME_RULE: AvailabilityRule = {
  type: "range",
  start: "0001-01-01",
  end: "0001-01-01",
  id: "lead-time",
  reason: "lead time",
};

const BOOKING_WINDOW_RULE: AvailabilityRule = {
  type: "range",
  start: "0001-01-01",
  end: "0001-01-01",
  id: "booking-window",
  reason: "booking window",
};

let warnedLegacy = false;

/** `true` for the pre-plan-11 shape (plan 11 R1). */
export function isLegacyAvailabilitySpec(
  input: AvailabilitySpec | LegacyAvailabilitySpec,
): input is LegacyAvailabilitySpec {
  return "mode" in input;
}

/** Convert the old shape into open/blocked rules (plan 11 R1). */
export function legacyToAvailabilitySpec(
  input: LegacyAvailabilitySpec,
): AvailabilitySpec {
  const rules: AvailabilityRule[] = [];
  if (input.dates?.length) {
    rules.push({ type: "dates", dates: input.dates });
  }
  for (const range of input.ranges ?? []) {
    rules.push({
      type: "range",
      start: range.start,
      // Legacy ranges are inclusive; the new engine is half-open (plan 11 R8).
      end: toEpochDay(range.end) >= MAX_DAY ? range.end : addDays(range.end, 1),
    });
  }
  if (input.weekdays?.length) {
    rules.push({ type: "weekly", days: input.weekdays });
  }
  return input.mode === "available" ? { open: rules } : { blocked: rules };
}

function instantOf(value: AvailabilityInput, zone: string): number {
  if (typeof value === "string") {
    if (value.includes("T")) {
      const dateTime = parseIsoDateTime(value);
      return toInstant(toZoned(dateTime, zone, "compatible"));
    }
    return instantOf(parseIsoDate(value), zone);
  }
  if ("timeZone" in value) {
    return toInstant(value);
  }
  if ("hour" in value) {
    return toInstant(toZoned(value, zone, "compatible"));
  }
  return toInstant(
    toZoned(plainDateTime(value, plainTime(0, 0)), zone, "compatible"),
  );
}

function startOfDayInstant(date: PlainDate, zone: string): number {
  return toInstant(
    toZoned(plainDateTime(date, plainTime(0, 0)), zone, "compatible"),
  );
}

function parseRangeBound(value: PlainDate | string): {
  date: PlainDate;
  time?: PlainTime;
} {
  if (typeof value !== "string") {
    return { date: value };
  }
  if (value.includes("T")) {
    const dateTime = parseIsoDateTime(value);
    return {
      date: dateTime,
      time: plainTime(dateTime.hour, dateTime.minute, dateTime.second),
    };
  }
  return { date: parseIsoDate(value) };
}

function rangeSpan(rule: RangeAvailabilityRule, zone: string): Span {
  const start = parseRangeBound(rule.start);
  const end = parseRangeBound(rule.end);
  const startAt = start.time
    ? toInstant(
        toZoned(plainDateTime(start.date, start.time), zone, "compatible"),
      )
    : startOfDayInstant(start.date, zone);
  const endAt = end.time
    ? toInstant(toZoned(plainDateTime(end.date, end.time), zone, "compatible"))
    : startOfDayInstant(end.date, zone);
  return { start: startAt, end: endAt, rule };
}

function mergeSpans(spans: readonly Span[]): Span[] {
  const sorted = [...spans].sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: Span[] = [];
  for (const span of sorted) {
    if (span.end <= span.start) {
      continue;
    }
    const last = merged[merged.length - 1];
    if (last && span.start <= last.end) {
      last.end = Math.max(last.end, span.end);
      if (!last.rule && span.rule) {
        last.rule = span.rule;
      }
    } else {
      merged.push({ ...span });
    }
  }
  return merged;
}

/** Contiguous pieces of `[start, end)` from open minus blocked (plan 11 §12.2 step 4). */
function sweep(
  open: readonly Span[],
  blocked: readonly Span[],
  start: number,
  end: number,
): AvailabilityInterval[] {
  const points = new Set<number>([start, end]);
  for (const span of open) {
    if (span.start > start && span.start < end) points.add(span.start);
    if (span.end > start && span.end < end) points.add(span.end);
  }
  for (const span of blocked) {
    if (span.start > start && span.start < end) points.add(span.start);
    if (span.end > start && span.end < end) points.add(span.end);
  }
  const sorted = [...points].sort((a, b) => a - b);
  const pieces: AvailabilityInterval[] = [];
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const from = sorted[index] as number;
    const to = sorted[index + 1] as number;
    if (to <= from) {
      continue;
    }
    const mid = (from + to) / 2;
    const isOpen = open.some((span) => span.start <= mid && mid < span.end);
    const blocking = blocked.filter(
      (span) => span.start <= mid && mid < span.end,
    );
    const status =
      isOpen && blocking.length === 0 ? "available" : "unavailable";
    const previous = pieces[pieces.length - 1];
    const rules = blocking
      .map((span) => span.rule)
      .filter((rule): rule is AvailabilityRule => rule !== undefined);
    if (
      previous &&
      previous.status === status &&
      previous.rules.length === rules.length &&
      previous.rules.every((rule, position) => rule === rules[position])
    ) {
      previous.end = to;
    } else {
      pieces.push({ start: from, end: to, status, rules });
    }
  }
  return pieces;
}

function sumMs(
  pieces: readonly AvailabilityInterval[],
  status: string,
): number {
  return pieces
    .filter((piece) => piece.status === status)
    .reduce((total, piece) => total + (piece.end - piece.start), 0);
}

/**
 * Compile an availability model (plan 11 V4). Pass `now` for lead time and
 * booking windows; without it those fields are skipped (no implicit clock read).
 */
export function createAvailability(
  input: AvailabilitySpec | LegacyAvailabilitySpec,
  options: AvailabilityOptions = {},
): Availability {
  let spec: AvailabilitySpec;
  if (isLegacyAvailabilitySpec(input)) {
    if (!warnedLegacy) {
      warnedLegacy = true;
      console.warn(
        "[chrono] The date-only AvailabilitySpec shape is deprecated; use { open, blocked }.",
      );
    }
    spec = legacyToAvailabilitySpec(input);
  } else {
    spec = input;
  }

  const ruleZone = spec.timeZone ?? options.timeZone ?? "UTC";
  const displayZone = options.timeZone ?? ruleZone;
  const now = options.now;

  const openRules = (spec.open ?? []).map(normalizeRule);
  const blockedRules = (spec.blocked ?? []).map(normalizeRule);
  const hasOpen = spec.open !== undefined;

  const dayCache = new Map<string, Span[]>();
  const statusCache = new Map<string, AvailabilityStatus>();
  const cacheKey = (dayEpoch: number, resourceId: string | undefined): string =>
    `${dayEpoch}|${resourceId ?? ""}`;

  const daySpans = (
    dayEpoch: number,
    resourceId: string | undefined,
  ): Span[] => {
    const key = cacheKey(dayEpoch, resourceId);
    const cached = dayCache.get(key);
    if (cached) {
      return cached;
    }
    const day = fromEpochDay(dayEpoch);
    const spans: Span[] = [];
    for (const rule of [...openRules, ...blockedRules]) {
      if (rule.type === "range" || !ruleMatchesResource(rule, resourceId)) {
        continue;
      }
      const span = expandRuleDay(rule, day, ruleZone);
      if (span.end > span.start) {
        spans.push({ ...span, rule });
      }
    }
    if (dayCache.size >= CACHE_DAYS) {
      const oldest = dayCache.keys().next().value;
      if (oldest !== undefined) dayCache.delete(oldest);
    }
    dayCache.set(key, spans);
    return spans;
  };

  const spansBetween = (
    rules: readonly AvailabilityRule[],
    start: number,
    end: number,
    resourceId: string | undefined,
  ): Span[] => {
    const spans: Span[] = [];
    // One-day margin on both sides so rules that cross midnight are included (V2 / §12.2).
    const first = Math.max(
      MIN_DAY,
      toEpochDay(fromInstant(start, ruleZone)) - 1,
    );
    const last = Math.min(MAX_DAY, toEpochDay(fromInstant(end, ruleZone)) + 1);
    for (let dayEpoch = first; dayEpoch <= last; dayEpoch += 1) {
      for (const span of daySpans(dayEpoch, resourceId)) {
        if (rules.includes(span.rule as AvailabilityRule)) {
          spans.push(span);
        }
      }
    }
    for (const rule of rules) {
      if (rule.type !== "range") {
        continue;
      }
      if (!ruleMatchesResource(rule, resourceId)) {
        continue;
      }
      const span = rangeSpan(rule as RangeAvailabilityRule, ruleZone);
      if (span.end > start && span.start < end) {
        spans.push(span);
      }
    }
    return spans;
  };

  // The lead-time-free base, so business days never depend on lead time (plan 11 §12.2).
  const baseBusiness: Availability | undefined =
    spec.leadTime?.businessDays !== undefined ||
    spec.bookingWindow !== undefined
      ? createAvailability(
          { ...spec, leadTime: undefined, bookingWindow: undefined },
          options,
        )
      : undefined;
  const businessDay = (date: PlainDate): boolean =>
    (baseBusiness ?? self).getDayStatus(date) !== "unavailable";

  const shiftBusinessDay = (date: PlainDate, direction: 1 | -1): PlainDate => {
    let day = addDays(date, direction);
    for (let step = 0; step < SEARCH_LIMIT; step += 1) {
      if (businessDay(day)) return day;
      day = addDays(day, direction);
    }
    throw new RangeError("No business day found within the search limit.");
  };

  const walkBusinessDays = (date: PlainDate, count: number): PlainDate => {
    if (count === 0) {
      return businessDay(date) ? date : shiftBusinessDay(date, 1);
    }
    const direction = count > 0 ? 1 : -1;
    let day = date;
    let remaining = Math.abs(count);
    for (let step = 0; step < SEARCH_LIMIT && remaining > 0; step += 1) {
      day = addDays(day, direction);
      if (businessDay(day)) remaining -= 1;
    }
    if (remaining > 0) {
      throw new RangeError("No business day found within the search limit.");
    }
    return day;
  };

  let notBefore = -Infinity;
  let notAfter = Infinity;
  const lead = spec.leadTime;
  if (now !== undefined) {
    const nowZoned = fromInstant(now, ruleZone);
    const today = plainDate(nowZoned.year, nowZoned.month, nowZoned.day);
    if (lead) {
      if (lead.minutes !== undefined || lead.hours !== undefined) {
        const ms = ((lead.minutes ?? 0) + (lead.hours ?? 0) * 60) * 60_000;
        notBefore = Math.max(notBefore, now + ms);
      }
      if (lead.days !== undefined) {
        notBefore = Math.max(
          notBefore,
          startOfDayInstant(addDays(today, lead.days), ruleZone),
        );
      }
      if (lead.businessDays !== undefined) {
        const cutoff =
          spec.cutoffTime === undefined
            ? Infinity
            : timeTokenToSeconds(spec.cutoffTime);
        const nowSeconds =
          nowZoned.hour * 3600 + nowZoned.minute * 60 + nowZoned.second;
        let orderDay = today;
        if (!businessDay(today) || nowSeconds >= cutoff) {
          orderDay = shiftBusinessDay(today, 1);
        }
        const target = walkBusinessDays(orderDay, lead.businessDays);
        notBefore = Math.max(notBefore, startOfDayInstant(target, ruleZone));
      }
    }
    const window = spec.bookingWindow;
    if (window) {
      let lastDay = today;
      if (window.days !== undefined) lastDay = addDays(today, window.days);
      if (window.months !== undefined) {
        lastDay = addMonths(today, window.months);
      }
      notAfter = startOfDayInstant(addDays(lastDay, 1), ruleZone);
    }
  }

  const blockedSpansFor = (
    start: number,
    end: number,
    resourceId: string | undefined,
  ): Span[] => {
    const spans = spansBetween(blockedRules, start, end, resourceId);
    if (notBefore > -Infinity) {
      spans.push({ start: -Infinity, end: notBefore, rule: LEAD_TIME_RULE });
    }
    if (notAfter < Infinity) {
      spans.push({ start: notAfter, end: Infinity, rule: BOOKING_WINDOW_RULE });
    }
    return spans;
  };

  const openSpansFor = (
    start: number,
    end: number,
    resourceId: string | undefined,
  ): Span[] =>
    hasOpen
      ? mergeSpans(spansBetween(openRules, start, end, resourceId))
      : [{ start, end }];

  const piecesBetween = (
    start: number,
    end: number,
    resourceId: string | undefined,
  ): AvailabilityInterval[] => {
    if (end <= start) {
      return [];
    }
    const open = openSpansFor(start, end, resourceId);
    const blocked = blockedSpansFor(start, end, resourceId);
    return sweep(open, blocked, start, end);
  };

  const instantAvailable = (
    at: number,
    resourceId: string | undefined,
  ): boolean => {
    const pieces = piecesBetween(at - 0.5, at + 0.5, resourceId);
    const piece = pieces.find((value) => value.start <= at && at < value.end);
    return piece?.status === "available";
  };

  const dayWindow = (date: PlainDate): [number, number] => [
    startOfDayInstant(date, displayZone),
    startOfDayInstant(addDays(date, 1), displayZone),
  ];

  const self: Availability = {
    timeZone: ruleZone,
    spec,
    getDayStatus(date, resourceId) {
      const statusKey = cacheKey(toEpochDay(date), resourceId);
      const cachedStatus = statusCache.get(statusKey);
      if (cachedStatus) {
        return cachedStatus;
      }
      const [start, end] = dayWindow(date);
      if (end <= start) {
        return "unavailable";
      }
      const open = openSpansFor(start, end, resourceId);
      const blocked = blockedSpansFor(start, end, resourceId);
      const potential = open.reduce(
        (total, span) =>
          total +
          Math.max(0, Math.min(span.end, end) - Math.max(span.start, start)),
        0,
      );
      if (potential <= 0) {
        return "unavailable";
      }
      const available = sweep(open, blocked, start, end);
      const availableMs = sumMs(available, "available");
      const status: AvailabilityStatus =
        availableMs <= 0
          ? "unavailable"
          : availableMs < potential
            ? "partial"
            : "available";
      if (statusCache.size >= CACHE_DAYS) {
        const oldest = statusCache.keys().next().value;
        if (oldest !== undefined) statusCache.delete(oldest);
      }
      statusCache.set(statusKey, status);
      return status;
    },
    getIntervals(start, end, resourceId) {
      const from = instantOf(start, displayZone);
      const to = instantOf(end, displayZone);
      return piecesBetween(from, to, resourceId);
    },
    isTimeAvailable(date, time, resourceId) {
      return instantAvailable(
        instantOf(plainDateTime(date, time), displayZone),
        resourceId,
      );
    },
    isRangeAvailable(start, end, resourceId) {
      const from = instantOf(start, displayZone);
      const to = instantOf(end, displayZone);
      if (to <= from) {
        return instantAvailable(from, resourceId);
      }
      return piecesBetween(from, to, resourceId).every(
        (piece) => piece.status === "available",
      );
    },
    nextAvailable(date, direction, resourceId) {
      let epochDay = toEpochDay(date) + direction;
      for (let step = 0; step < SEARCH_LIMIT; step += 1) {
        if (epochDay < MIN_DAY || epochDay > MAX_DAY) {
          return null;
        }
        const day = fromEpochDay(epochDay);
        if (self.getDayStatus(day, resourceId) !== "unavailable") {
          return day;
        }
        epochDay += direction;
      }
      return null;
    },
    isAvailable(date) {
      return self.getDayStatus(date) !== "unavailable";
    },
  };
  return self;
}

/** A day with some available time (plan 11 V14). */
export function isBusinessDay(
  date: PlainDate,
  availability: Availability,
): boolean {
  return availability.getDayStatus(date) !== "unavailable";
}

/** Move `count` business days (0 = `date` or the next business day). */
export function addBusinessDays(
  date: PlainDate,
  count: number,
  availability: Availability,
): PlainDate {
  if (count === 0) {
    let day = date;
    for (let step = 0; step < SEARCH_LIMIT; step += 1) {
      if (isBusinessDay(day, availability)) return day;
      day = addDays(day, 1);
    }
    throw new RangeError("No business day found within the search limit.");
  }
  const direction = count > 0 ? 1 : -1;
  let remaining = Math.abs(count);
  let day = date;
  for (let step = 0; step < SEARCH_LIMIT && remaining > 0; step += 1) {
    day = addDays(day, direction);
    if (isBusinessDay(day, availability)) remaining -= 1;
  }
  if (remaining > 0) {
    throw new RangeError("No business day found within the search limit.");
  }
  return day;
}

/** Business days in an inclusive date range (plan 11 V14). */
export function countBusinessDays(
  range: DateRange,
  availability: Availability,
): number {
  let count = 0;
  for (
    let epochDay = toEpochDay(range.start);
    epochDay <= toEpochDay(range.end);
    epochDay += 1
  ) {
    if (isBusinessDay(fromEpochDay(epochDay), availability)) count += 1;
  }
  return count;
}

/** The first rule's `reason`, if any (plan 11 V12). */
export function getAvailabilityLabel(
  rules: readonly AvailabilityRule[],
): string {
  return rules[0]?.reason ?? "";
}

const compileCache = new WeakMap<object, Map<string, Availability>>();

/**
 * Compile once per spec identity **and** options (plan 11 R7): the same spec in
 * another zone, or with another `now`, is a different model.
 */
export function compileAvailability(
  input: AvailabilitySpec | Availability,
  options: AvailabilityOptions = {},
): Availability {
  if (typeof (input as Availability).getDayStatus === "function") {
    return input as Availability;
  }
  const key = `${options.timeZone ?? ""}|${options.now ?? ""}`;
  let byOptions = compileCache.get(input as object);
  if (!byOptions) {
    byOptions = new Map();
    compileCache.set(input as object, byOptions);
  }
  const cached = byOptions.get(key);
  if (cached) {
    return cached;
  }
  if (byOptions.size >= 8) {
    // A moving `now` would otherwise grow the map without bound.
    byOptions.clear();
  }
  const value = createAvailability(input as AvailabilitySpec, options);
  byOptions.set(key, value);
  return value;
}

let warnedDailyOnly = false;

/** Time-only components use `daily` rules only (plan 11 V6). */
export function filterDailyRules(spec: AvailabilitySpec): AvailabilitySpec {
  const keep = (rules: readonly AvailabilityRule[] | undefined) =>
    rules?.filter((rule) => rule.type === "daily");
  const open = keep(spec.open);
  const blocked = keep(spec.blocked);
  const dropped =
    (spec.open?.length ?? 0) -
    (open?.length ?? 0) +
    (spec.blocked?.length ?? 0) -
    (blocked?.length ?? 0);
  if (dropped > 0 && !warnedDailyOnly) {
    warnedDailyOnly = true;
    console.warn(
      "[chrono] Time-only components only use `daily` availability rules; other rule types are ignored.",
    );
  }
  return { ...spec, open, blocked };
}
