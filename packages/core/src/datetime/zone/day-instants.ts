import {
  type PlainDate,
  type PlainTime,
  fromSecondOfDay,
  plainDateTime,
  toInstant,
  toZoned,
} from "../../foundation/index.js";

export type DayInstant = {
  /** `HH:mm`, or `HH:mm#2` for the second occurrence of a repeated time. */
  key: string;
  time: PlainTime;
  /** Minutes east of UTC. */
  offset: number;
  /** Epoch milliseconds: the identity of the entry. */
  instant: number;
  /** 1, or 2 for the repeated hour. */
  ordinal: 1 | 2;
};

const wallEquals = (
  zoned: { hour: number; minute: number; second: number },
  time: PlainTime,
): boolean =>
  zoned.hour === time.hour &&
  zoned.minute === time.minute &&
  zoned.second === time.second;

const pad = (n: number) => String(n).padStart(2, "0");

/** `+07:00` for an offset in minutes. */
export function formatOffset(minutes: number): string {
  const abs = Math.abs(minutes);
  return `${minutes < 0 ? "-" : "+"}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/**
 * Wall-aligned entries of one day (plan 08 X4): times in a gap are left out, times in
 * the repeated hour appear twice (earlier first), each with its offset.
 */
export function getDayInstants(
  date: PlainDate,
  timeZone: string,
  stepMinutes: number,
): DayInstant[] {
  const entries: DayInstant[] = [];
  const step = Math.max(1, stepMinutes) * 60;
  for (let at = 0; at < 86400; at += step) {
    const time = fromSecondOfDay(at);
    const wall = plainDateTime(date, time);
    const earlier = toZoned(wall, timeZone, "earlier");
    const later = toZoned(wall, timeZone, "later");
    const keep = (zoned: typeof earlier) => wallEquals(zoned, time);
    const key = `${pad(time.hour)}:${pad(time.minute)}`;
    if (!keep(earlier) && !keep(later)) continue; // gap
    if (keep(earlier) && keep(later) && earlier.offset !== later.offset) {
      entries.push(
        {
          key,
          time,
          offset: earlier.offset,
          instant: toInstant(earlier),
          ordinal: 1,
        },
        {
          key: `${key}#2`,
          time,
          offset: later.offset,
          instant: toInstant(later),
          ordinal: 2,
        },
      );
    } else {
      const zoned = keep(earlier) ? earlier : later;
      entries.push({
        key,
        time,
        offset: zoned.offset,
        instant: toInstant(zoned),
        ordinal: 1,
      });
    }
  }
  return entries;
}
