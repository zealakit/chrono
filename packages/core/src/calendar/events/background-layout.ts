import {
  type Availability,
  type AvailabilityRule,
  type PlainDate,
  type PlainDateTime,
  type PlainTime,
  addDays,
  fromInstant,
  fromSecondOfDay,
  plainDateTime,
  toSecondOfDay,
} from "../../foundation/index.js";
import { wallSecondsOf } from "./normalize.js";

/** Which pieces a layout emits (plan 11 V9). */
export type BackgroundMode = "unavailable" | "available" | "both" | false;

export type BackgroundStatus = "available" | "unavailable";

/** A shaded piece in a time-grid day column or a resource column (plan 11 V9). */
export type BackgroundPiece = {
  /** `${resourceKey}:${dayKey}:${startMs}`. */
  key: string;
  dayKey: string;
  resourceKey?: string;
  /** Fractions 0–1 of the visible axis (same convention as events, 05 E10). */
  top: number;
  height: number;
  status: BackgroundStatus;
  rules: readonly AvailabilityRule[];
};

/** A shaded piece in one timeline row. */
export type TimelineBackgroundPiece = {
  key: string;
  rowKey: string;
  resourceKey?: string;
  /** Fractions 0–1 of the timeline axis. */
  left: number;
  width: number;
  status: BackgroundStatus;
  rules: readonly AvailabilityRule[];
};

export type BackgroundDay = {
  date: PlainDate;
  /** The cell's `data-chrono-key`. */
  key: string;
  resourceId?: string;
  resourceKey?: string;
};

export type BackgroundLayoutOptions = {
  availability: Availability;
  /** The display zone (wall times are read here). */
  timeZone: string;
  days: readonly BackgroundDay[];
  dayStart?: PlainTime;
  /** Exclusive. */
  dayEnd?: PlainTime;
  /** Default `"unavailable"`. */
  mode?: BackgroundMode;
};

export type TimelineBackgroundOptions = {
  availability: Availability;
  timeZone: string;
  rows: readonly { key: string; resourceId?: string; resourceKey?: string }[];
  start: PlainDateTime;
  end: PlainDateTime;
  mode?: BackgroundMode;
};

const SECONDS_PER_DAY = 86400;

const wants = (mode: BackgroundMode, status: BackgroundStatus): boolean =>
  mode === "both" || mode === status;

/**
 * Pieces for time-grid and resource time-grid day columns (plan 11 V9 / R5:
 * month cells get attributes only). Coordinates match event pieces.
 */
export function layoutBackgrounds(
  options: BackgroundLayoutOptions,
): BackgroundPiece[] {
  const mode = options.mode ?? "unavailable";
  if (mode === false) {
    return [];
  }
  const axisStart = options.dayStart ? toSecondOfDay(options.dayStart) : 0;
  const rawEnd = options.dayEnd
    ? toSecondOfDay(options.dayEnd)
    : SECONDS_PER_DAY;
  const axisEnd = rawEnd <= axisStart ? SECONDS_PER_DAY : rawEnd;
  const axisLength = axisEnd - axisStart;
  const pieces: BackgroundPiece[] = [];
  for (const day of options.days) {
    const start = plainDateTime(day.date, fromSecondOfDay(axisStart));
    const end = plainDateTime(
      axisEnd >= SECONDS_PER_DAY ? addDays(day.date, 1) : day.date,
      fromSecondOfDay(axisEnd % SECONDS_PER_DAY),
    );
    for (const interval of options.availability.getIntervals(
      start,
      end,
      day.resourceId,
    )) {
      if (!wants(mode, interval.status)) {
        continue;
      }
      // Wall time on both edges, like event pieces (05 E9): a DST day keeps its axis.
      const wallStart = fromInstant(interval.start, options.timeZone);
      const wallEnd = fromInstant(interval.end, options.timeZone);
      const top = (toSecondOfDay(wallStart) - axisStart) / axisLength;
      const height =
        (wallSecondsOf(wallEnd) - wallSecondsOf(wallStart)) / axisLength;
      const clampedTop = Math.max(0, Math.min(1, top));
      pieces.push({
        key: `${day.resourceKey ?? ""}:${day.key}:${interval.start}`,
        dayKey: day.key,
        resourceKey: day.resourceKey,
        top: clampedTop,
        height: Math.max(0, Math.min(1 - clampedTop, height)),
        status: interval.status,
        rules: interval.rules,
      });
    }
  }
  return pieces;
}

/** Pieces for one timeline axis, per row (plan 11 V9). */
export function layoutTimelineBackgrounds(
  options: TimelineBackgroundOptions,
): TimelineBackgroundPiece[] {
  const mode = options.mode ?? "unavailable";
  if (mode === false) {
    return [];
  }
  const startSeconds = wallSecondsOf(options.start);
  const endSeconds = wallSecondsOf(options.end);
  const length = endSeconds - startSeconds;
  if (length <= 0) {
    return [];
  }
  const pieces: TimelineBackgroundPiece[] = [];
  for (const row of options.rows) {
    for (const interval of options.availability.getIntervals(
      options.start,
      options.end,
      row.resourceId,
    )) {
      if (!wants(mode, interval.status)) {
        continue;
      }
      const wallStart = fromInstant(interval.start, options.timeZone);
      const wallEnd = fromInstant(interval.end, options.timeZone);
      const left = (wallSecondsOf(wallStart) - startSeconds) / length;
      const width =
        (wallSecondsOf(wallEnd) - wallSecondsOf(wallStart)) / length;
      const clampedLeft = Math.max(0, Math.min(1, left));
      pieces.push({
        key: `${row.resourceKey ?? row.key}:${interval.start}`,
        rowKey: row.key,
        resourceKey: row.resourceKey,
        left: clampedLeft,
        width: Math.max(0, Math.min(1 - clampedLeft, width)),
        status: interval.status,
        rules: interval.rules,
      });
    }
  }
  return pieces;
}

/** The `data-chrono-background` attribute record for a piece (plan 11 V9, V12). */
export function backgroundAttributes(
  piece: BackgroundPiece | TimelineBackgroundPiece,
): Record<string, string | number | boolean> {
  const attributes: Record<string, string | number | boolean> = {
    "aria-hidden": "true",
    "data-chrono-background": true,
    "data-status": piece.status,
    "data-chrono-key": "dayKey" in piece ? piece.dayKey : piece.rowKey,
  };
  if (piece.resourceKey !== undefined) {
    attributes["data-resource-id"] = piece.resourceKey;
  }
  if ("dayKey" in piece) {
    attributes["--chrono-background-top"] = piece.top;
    attributes["--chrono-background-height"] = piece.height;
  } else {
    attributes["--chrono-background-left"] = piece.left;
    attributes["--chrono-background-width"] = piece.width;
  }
  const ruleId = piece.rules[0]?.id;
  if (ruleId !== undefined) {
    attributes["data-rule-id"] = ruleId;
  }
  return attributes;
}
