import {
  type PlainDate,
  type PlainDateTime,
  type PlainTime,
  addDays,
  compare,
  fromEpochDay,
  fromSecondOfDay,
  plainDateTime,
  plainTime,
  splitIntervalByDay,
  type IntervalPiece,
} from "../../foundation/index.js";
import { wallSecondsOf } from "../events/normalize.js";

const SECONDS_PER_DAY = 86400;

export type SelectionCell = {
  date: PlainDate;
  /** Present for a timed slot; absent for a day cell / all-day row. */
  time?: PlainTime;
};

export type SelectionOptions = {
  /** Select whole days (month grid / all-day row) instead of a timed range. */
  allDay?: boolean;
  /** Snap granularity for timed selection (plan 05 E14), default 30 minutes. */
  slotDurationMinutes?: number;
  /** Clamp the selection length (E14); clamping is not invalidation. */
  maxDurationMinutes?: number;
};

/** The half-open `[start, end)` selection. All-day ends are exclusive midnights. */
export type SelectionRange = {
  start: PlainDateTime;
  end: PlainDateTime;
  allDay: boolean;
};

function fromWallSeconds(seconds: number): PlainDateTime {
  const day = Math.floor(seconds / SECONDS_PER_DAY);
  const secondOfDay = seconds - day * SECONDS_PER_DAY;
  return plainDateTime(fromEpochDay(day), fromSecondOfDay(secondOfDay));
}

/**
 * Compute a selection from an anchor cell to a current cell (plan 05 E14):
 * one continuous range, snapped to `slotDurationMinutes`, `end` exclusive and
 * `start + slot` when anchor and current are the same. Dragging backwards
 * swaps. All-day selection spans whole days with an exclusive end.
 */
export function computeSelection(
  anchor: SelectionCell,
  current: SelectionCell,
  options: SelectionOptions = {},
): SelectionRange {
  if (options.allDay) {
    const start =
      compare(anchor.date, current.date) <= 0 ? anchor.date : current.date;
    const end =
      compare(anchor.date, current.date) <= 0 ? current.date : anchor.date;
    return {
      start: plainDateTime(start, plainTime(0, 0, 0)),
      end: plainDateTime(addDays(end, 1), plainTime(0, 0, 0)),
      allDay: true,
    };
  }

  const slot = (options.slotDurationMinutes ?? 30) * 60;
  const anchorSeconds = wallSecondsOf(
    plainDateTime(anchor.date, anchor.time ?? plainTime(0, 0, 0)),
  );
  const currentSeconds = wallSecondsOf(
    plainDateTime(current.date, current.time ?? plainTime(0, 0, 0)),
  );
  const a = Math.floor(anchorSeconds / slot) * slot;
  const c = Math.floor(currentSeconds / slot) * slot;
  const startSeconds = Math.min(a, c);
  let endSeconds = Math.max(a, c) + slot;
  if (options.maxDurationMinutes !== undefined) {
    const max = options.maxDurationMinutes * 60;
    if (endSeconds - startSeconds > max) {
      endSeconds = startSeconds + max;
    }
  }
  return {
    start: fromWallSeconds(startSeconds),
    end: fromWallSeconds(endSeconds),
    allDay: false,
  };
}

/** The per-day pieces of a selection, for the preview elements (plan 05 §2.6). */
export function selectionPieces(
  range: SelectionRange,
): IntervalPiece<PlainDateTime>[] {
  return splitIntervalByDay({ start: range.start, end: range.end });
}
