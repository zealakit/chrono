import type { PlainTime } from "./types.js";

export const SECONDS_PER_DAY = 86400;

export function isValidTime(
  hour: number,
  minute: number,
  second: number,
): boolean {
  return (
    Number.isInteger(hour) &&
    Number.isInteger(minute) &&
    Number.isInteger(second) &&
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59 &&
    second >= 0 &&
    second <= 59
  );
}

export function plainTime(hour: number, minute: number, second = 0): PlainTime {
  if (!isValidTime(hour, minute, second)) {
    throw new RangeError(
      `Invalid time ${hour}:${minute}:${second}: expected hour 0-23, minute 0-59, second 0-59.`,
    );
  }
  return Object.freeze({ hour, minute, second });
}

export function toSecondOfDay(time: PlainTime): number {
  return time.hour * 3600 + time.minute * 60 + time.second;
}

export function fromSecondOfDay(secondOfDay: number): PlainTime {
  if (
    !Number.isInteger(secondOfDay) ||
    secondOfDay < 0 ||
    secondOfDay >= SECONDS_PER_DAY
  ) {
    throw new RangeError(`Second of day out of range: ${secondOfDay}.`);
  }
  return Object.freeze({
    hour: Math.floor(secondOfDay / 3600),
    minute: Math.floor((secondOfDay % 3600) / 60),
    second: secondOfDay % 60,
  });
}

/** Add seconds, wrapping at midnight. `dayDelta` is the number of days carried. */
export function addSeconds(
  time: PlainTime,
  seconds: number,
): { time: PlainTime; dayDelta: number } {
  const total = toSecondOfDay(time) + seconds;
  const dayDelta = Math.floor(total / SECONDS_PER_DAY);
  return {
    time: fromSecondOfDay(total - dayDelta * SECONDS_PER_DAY),
    dayDelta,
  };
}

export function addMinutes(
  time: PlainTime,
  minutes: number,
): { time: PlainTime; dayDelta: number } {
  return addSeconds(time, minutes * 60);
}
