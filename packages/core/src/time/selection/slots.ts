import {
  type PlainTime,
  type TimeConstraints,
  type TimeInput,
  fromSecondOfDay,
  getTimeStatus,
  toPlainTime,
  toSecondOfDay,
} from "../../foundation/index.js";

/** An app-supplied slot (plan 07 T9, R2: named `BookingSlot` to avoid the foundation `TimeSlot`). */
export type BookingSlotInput = {
  start: TimeInput;
  end?: TimeInput;
  available?: boolean;
  data?: unknown;
};

export type BookingSlot = {
  /** `HH:mm` of the start (`HH:mm:ss` when it has seconds). */
  key: string;
  start: PlainTime;
  /** Wraps to 00:00 for a slot ending at 24:00; use `endSecond` to tell them apart. */
  end: PlainTime;
  startSecond: number;
  /** Up to 86400. */
  endSecond: number;
  available: boolean;
  data?: unknown;
};

export type SlotOptions = {
  start?: TimeInput;
  /** Exclusive; omit for the end of the day. */
  end?: TimeInput;
  /** Minutes. */
  slotDuration?: number;
  /** Minutes between slot starts (default `slotDuration`). */
  step?: number;
  slots?: readonly BookingSlotInput[];
  min?: TimeInput;
  max?: TimeInput;
  disabledRanges?: readonly { start: TimeInput; end: TimeInput }[];
  isTimeDisabled?: (time: PlainTime) => boolean;
  isTimeUnavailable?: (time: PlainTime) => boolean;
};

const DAY = 86400;

export function timeKey(time: PlainTime): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(time.hour)}:${pad(time.minute)}${time.second ? `:${pad(time.second)}` : ""}`;
}

/** Constraints a slot or option is checked against (the step is not one: slots set their own). */
export function toConstraints(options: SlotOptions): TimeConstraints {
  return {
    min: options.min === undefined ? undefined : toPlainTime(options.min),
    max: options.max === undefined ? undefined : toPlainTime(options.max),
    disabledRanges: options.disabledRanges?.map((range) => ({
      start: toPlainTime(range.start),
      end: toPlainTime(range.end),
    })),
    isTimeDisabled: options.isTimeDisabled,
  };
}

function build(
  startSecond: number,
  endSecond: number,
  options: SlotOptions,
  explicit?: BookingSlotInput,
): BookingSlot {
  const start = fromSecondOfDay(startSecond);
  const constraints = toConstraints(options);
  let available = explicit?.available !== false;
  if (available && !getTimeStatus(start, constraints).selectable)
    available = false;
  if (available && options.isTimeUnavailable?.(start)) available = false;
  if (available) {
    // A slot that overlaps a disabled range is not bookable (half-open overlap).
    for (const range of constraints.disabledRanges ?? []) {
      const from = toSecondOfDay(range.start);
      const to = toSecondOfDay(range.end) || DAY;
      if (startSecond < to && from < endSecond) available = false;
    }
  }
  return {
    key: timeKey(start),
    start,
    end: fromSecondOfDay(endSecond % DAY),
    startSecond,
    endSecond,
    available,
    ...(explicit?.data !== undefined ? { data: explicit.data } : {}),
  };
}

/**
 * Bookable slots: explicit `slots` win; otherwise `[s, s + slotDuration)` from
 * `start` to `end`. A slot that would end after `end` is dropped, never shortened.
 */
export function getBookingSlots(options: SlotOptions = {}): BookingSlot[] {
  const duration = (options.slotDuration ?? 0) * 60;
  if (options.slots) {
    const seen = new Set<number>();
    return options.slots
      .map((input) => {
        const start = toSecondOfDay(toPlainTime(input.start));
        const end =
          input.end === undefined
            ? start + (duration || (options.step ?? 30) * 60)
            : toSecondOfDay(toPlainTime(input.end)) || DAY;
        return { input, start, end };
      })
      .sort((a, b) => a.start - b.start)
      .filter((slot) => !seen.has(slot.start) && seen.add(slot.start))
      .map((slot) => build(slot.start, slot.end, options, slot.input));
  }
  if (duration <= 0) return [];
  const first =
    options.start === undefined ? 0 : toSecondOfDay(toPlainTime(options.start));
  const last =
    options.end === undefined
      ? DAY
      : toSecondOfDay(toPlainTime(options.end)) || DAY;
  const stride = (options.step ?? options.slotDuration ?? 0) * 60 || duration;
  const slots: BookingSlot[] = [];
  for (let at = first; at + duration <= last; at += stride) {
    slots.push(build(at, at + duration, options));
  }
  return slots;
}
