import {
  type PlainDate,
  type PlainDateTime,
  fromEpochDay,
  formatDateTime,
  plainDateTime,
  plainTime,
  toEpochDay,
} from "../../foundation/index.js";
import type {
  TimelineAxis,
  TimelineHeaderCell,
  TimelineSlot,
  TimelineSlotDuration,
  TimelineUnit,
} from "./types.js";

const DAY = 86400;
const pad = (n: number): string => String(n).padStart(2, "0");

/** `YYYY-MM-DDTHH:mm` of a wall-time value (the slot key base, plan 10 IG4). */
export const slotKeyOf = (value: PlainDateTime): string =>
  `${value.year}-${pad(value.month)}-${pad(value.day)}T${pad(value.hour)}:${pad(value.minute)}`;

export function slotSeconds(duration: TimelineSlotDuration): number {
  if (duration.minutes !== undefined) return duration.minutes * 60;
  if (duration.days !== undefined) return duration.days * DAY;
  if (duration.weeks !== undefined) return duration.weeks * 7 * DAY;
  return 3600;
}

const at = (epochSeconds: number): PlainDateTime => {
  const day = Math.floor(epochSeconds / DAY);
  const rest = epochSeconds - day * DAY;
  return plainDateTime(
    fromEpochDay(day),
    plainTime(
      Math.floor(rest / 3600),
      Math.floor((rest % 3600) / 60),
      rest % 60,
    ),
  );
};

/** The bucket id of `value` in `unit`; slots with the same id share a header cell. */
function bucket(value: PlainDateTime, unit: TimelineUnit): string {
  const day = toEpochDay(value);
  switch (unit) {
    case "month":
      return `${value.year}-${pad(value.month)}`;
    case "week":
      // Monday-based week: epoch day 0 is a Thursday.
      return `W${Math.floor((day + 3) / 7)}`;
    case "day":
      return `${value.year}-${pad(value.month)}-${pad(value.day)}`;
    case "hour":
      return `${value.year}-${pad(value.month)}-${pad(value.day)}T${pad(value.hour)}`;
    default:
      return slotKeyOf(value);
  }
}

function labelOf(
  value: PlainDateTime,
  unit: TimelineUnit,
  locale: string | undefined,
): string {
  switch (unit) {
    case "month":
      return formatDateTime(value, locale, { month: "long", year: "numeric" });
    case "week":
    case "day":
      return formatDateTime(value, locale, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    case "hour":
      return formatDateTime(value, locale, { hour: "numeric" });
    default:
      return formatDateTime(value, locale, {
        hour: "numeric",
        minute: "2-digit",
      });
  }
}

/**
 * The timeline axis (plan 10 R6): wall-time slots over `days`, and header rows
 * (coarser unit first) whose cells span the slots inside them.
 */
export function buildTimelineAxis(
  first: PlainDate,
  dayCount: number,
  duration: TimelineSlotDuration,
  headerRows: readonly TimelineUnit[],
  locale: string | undefined,
): TimelineAxis {
  const size = slotSeconds(duration);
  const origin = toEpochDay(first) * DAY;
  const length = dayCount * DAY;
  const slots: TimelineSlot[] = [];
  for (let offset = 0; offset < length; offset += size) {
    const start = at(origin + offset);
    slots.push({ index: slots.length, key: slotKeyOf(start), start, offset });
  }
  const rows = headerRows.map((unit) => {
    const cells: TimelineHeaderCell[] = [];
    for (const slot of slots) {
      const id = bucket(slot.start, unit);
      const last = cells[cells.length - 1];
      if (last && last.key === `${unit}:${id}`) {
        last.span += 1;
      } else {
        cells.push({
          key: `${unit}:${id}`,
          unit,
          label: labelOf(slot.start, unit, locale),
          start: slot.start,
          span: 1,
          startSlot: slot.index,
        });
      }
    }
    return { unit, cells };
  });
  return {
    start: at(origin),
    length,
    slotSeconds: size,
    slots,
    headerRows: rows,
  };
}
