import type {
  CalendarEventInput,
  MonthEventLayout,
  MonthSegment,
} from "./types.js";

/** One day's overflow (plan 05 §2.3, 13.3). */
export type DayOverflow<
  TEvent extends CalendarEventInput = CalendarEventInput,
> = {
  /** ISO date of the overflowing day. */
  dayKey: string;
  /** Number of hidden pieces on that day. */
  count: number;
  /** The hidden events, for `onMoreActivate` (deduplicated). */
  events: TEvent[];
};

export type OverflowResult<
  TEvent extends CalendarEventInput = CalendarEventInput,
> = {
  segments: MonthSegment<TEvent>[];
  more: DayOverflow<TEvent>[];
};

/** A piece the overflow limit can act on. */
type PieceLike = {
  startColumn: number;
  days: number;
  lane: number;
  hidden: boolean;
  event: CalendarEventInput;
};

function isHiddenOn(
  lane: number,
  column: number,
  lanesAt: Map<number, Set<number>>,
  limit: number,
): boolean {
  const lanes = lanesAt.get(column);
  // With limit L, lanes 0..L-2 stay visible only when a day has more than L lanes.
  return lanes !== undefined && lanes.size > limit && lane >= limit - 1;
}

/**
 * The overflow rule shared by the month view and the all-day row (plan 05 E7):
 * a day with more than `limit` lanes shows only lanes `0..limit-2` and counts
 * the rest as "+N more". A piece hidden on some days and visible on others is
 * split so each run has one `hidden` flag (13.3). No `limit` (or a non-positive
 * one) leaves everything visible.
 */
export function applyPieceLimit<P extends PieceLike>(
  pieces: readonly P[],
  limit: number | undefined,
  groupKey: (piece: P) => string,
  columnKey: (piece: P, column: number) => string | undefined,
): { pieces: P[]; more: DayOverflow<P["event"]>[] } {
  if (limit === undefined || !Number.isFinite(limit) || limit <= 0) {
    return {
      pieces: pieces.map((piece) => ({ ...piece, hidden: false })),
      more: [],
    };
  }

  const groups = new Map<string, P[]>();
  for (const piece of pieces) {
    const key = groupKey(piece);
    const list = groups.get(key) ?? [];
    groups.set(key, list);
    list.push(piece);
  }

  const out: P[] = [];
  for (const group of groups.values()) {
    const lanesAt = new Map<number, Set<number>>();
    for (const piece of group) {
      for (
        let c = piece.startColumn;
        c < piece.startColumn + piece.days;
        c += 1
      ) {
        const lanes = lanesAt.get(c) ?? new Set<number>();
        lanes.add(piece.lane);
        lanesAt.set(c, lanes);
      }
    }
    for (const piece of group) {
      const runs: { start: number; days: number; hidden: boolean }[] = [];
      let start = piece.startColumn;
      let hidden = isHiddenOn(piece.lane, start, lanesAt, limit);
      for (
        let c = piece.startColumn + 1;
        c < piece.startColumn + piece.days;
        c += 1
      ) {
        const next = isHiddenOn(piece.lane, c, lanesAt, limit);
        if (next !== hidden) {
          runs.push({ start, days: c - start, hidden });
          start = c;
          hidden = next;
        }
      }
      runs.push({
        start,
        days: piece.startColumn + piece.days - start,
        hidden,
      });
      for (const run of runs) {
        out.push({
          ...piece,
          startColumn: run.start,
          days: run.days,
          hidden: run.hidden,
        });
      }
    }
  }

  const more = new Map<string, { count: number; events: Set<P["event"]> }>();
  for (const piece of out) {
    if (!piece.hidden) {
      continue;
    }
    for (
      let c = piece.startColumn;
      c < piece.startColumn + piece.days;
      c += 1
    ) {
      const dayKey = columnKey(piece, c);
      if (!dayKey) {
        continue;
      }
      const entry = more.get(dayKey) ?? {
        count: 0,
        events: new Set<P["event"]>(),
      };
      entry.count += 1;
      entry.events.add(piece.event);
      more.set(dayKey, entry);
    }
  }

  return {
    pieces: out,
    more: [...more.entries()]
      .map(([dayKey, entry]) => ({
        dayKey,
        count: entry.count,
        events: [...entry.events],
      }))
      .sort((a, b) => (a.dayKey < b.dayKey ? -1 : a.dayKey > b.dayKey ? 1 : 0)),
  };
}

function columnKeys(layout: MonthEventLayout): Map<string, string> {
  const keys = new Map<string, string>();
  layout.months.forEach((month, monthIndex) => {
    month.weeks.forEach((week, weekIndex) => {
      week.days
        .filter((day) => !day.hidden)
        .forEach((day, column) => {
          keys.set(`${monthIndex}:${weekIndex}:${column}`, day.key);
        });
    });
  });
  return keys;
}

/** Apply an `eventLimit` to month segments (plan 05 E7). */
export function applyEventLimit<T extends CalendarEventInput>(
  segments: readonly MonthSegment<T>[],
  limit: number | undefined,
  layout: MonthEventLayout,
): OverflowResult<T> {
  const keys = columnKeys(layout);
  const { pieces, more } = applyPieceLimit(
    segments,
    limit,
    (segment) => `${segment.month}:${segment.week}`,
    (segment, column) => keys.get(`${segment.month}:${segment.week}:${column}`),
  );
  return { segments: pieces, more };
}
