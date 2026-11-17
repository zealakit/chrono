import { stepToSeconds, type TimeStep } from "../constraints/time.js";
import {
  SECONDS_PER_DAY,
  fromSecondOfDay,
  toSecondOfDay,
} from "../values/plain-time.js";
import type { PlainTime } from "../values/types.js";

export type TimeSlot = {
  index: number;
  start: PlainTime;
  /** Wraps to 00:00:00 for a slot ending at 24:00; use `endSecond` to tell them apart. */
  end: PlainTime;
  startSecond: number;
  /** Seconds since midnight, up to 86400. */
  endSecond: number;
  working: boolean;
};

export type TimeAxisOptions = {
  start?: PlainTime;
  /** Exclusive. Omit for the end of the day (24:00). */
  end?: PlainTime;
  step: TimeStep;
  /** Half-open `[start, end)` ranges; an `end` of 00:00 means 24:00. */
  workingHours?: readonly { start: PlainTime; end: PlainTime }[];
};

/** Wall-time slots. DST is handled at layout time, where real days are known. */
export function getTimeAxis(options: TimeAxisOptions): TimeSlot[] {
  const size = stepToSeconds(options.step);
  if (size <= 0) {
    throw new RangeError("Time axis step must be greater than zero.");
  }
  const from = options.start ? toSecondOfDay(options.start) : 0;
  const to = options.end ? toSecondOfDay(options.end) : SECONDS_PER_DAY;
  if (to <= from) {
    throw new RangeError("Time axis end must be after start.");
  }
  const working = (options.workingHours ?? []).map((range) => {
    const start = toSecondOfDay(range.start);
    const end = toSecondOfDay(range.end);
    return [start, end === 0 && start > 0 ? SECONDS_PER_DAY : end] as const;
  });
  const slots: TimeSlot[] = [];
  for (
    let startSecond = from, index = 0;
    startSecond < to;
    startSecond += size, index += 1
  ) {
    const endSecond = Math.min(startSecond + size, to);
    slots.push({
      index,
      start: fromSecondOfDay(startSecond),
      end: fromSecondOfDay(endSecond % SECONDS_PER_DAY),
      startSecond,
      endSecond,
      working: working.some(
        ([start, end]) => startSecond >= start && startSecond < end,
      ),
    });
  }
  return slots;
}
