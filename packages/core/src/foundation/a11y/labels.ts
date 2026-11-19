import { formatDate, formatDateRange, formatTime } from "../locale/format.js";
import type { DateRange } from "../ranges/date-range.js";
import type { PlainDate, PlainTime } from "../values/types.js";
import { defaultMessages, type Messages } from "./messages.js";

export type LabelStatus = {
  today?: boolean;
  selected?: boolean;
  unavailable?: boolean;
  partiallyAvailable?: boolean;
  disabled?: boolean;
  /** Extra wording, e.g. a blocked rule's reason (plan 11 V12). */
  reason?: string;
  rangeStart?: boolean;
  rangeEnd?: boolean;
  inRange?: boolean;
};

const STATE_ORDER = [
  "today",
  "rangeStart",
  "rangeEnd",
  "inRange",
  "selected",
  "unavailable",
  "partiallyAvailable",
  "disabled",
] as const satisfies readonly (keyof LabelStatus & keyof Messages)[];

function words(status: LabelStatus, messages: Messages): string[] {
  const words = STATE_ORDER.filter((key) => status[key]).map(
    (key) => messages[key],
  );
  return status.reason ? [...words, status.reason] : words;
}

/** For example "Tuesday, November 17, 2026, today, selected". */
export function getDateLabel(
  date: PlainDate,
  locale: string | undefined,
  status: LabelStatus = {},
  messages: Messages = defaultMessages,
): string {
  const text = formatDate(date, locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return [text, ...words(status, messages)].join(", ");
}

/** For example "3:30 PM, selected". */
export function getTimeLabel(
  time: PlainTime,
  locale: string | undefined,
  status: LabelStatus = {},
  messages: Messages = defaultMessages,
): string {
  const text = formatTime(time, locale, {
    hour: "numeric",
    minute: "2-digit",
    second: time.second === 0 ? undefined : "2-digit",
  });
  return [text, ...words(status, messages)].join(", ");
}

/** For example "November 17 – 20, 2026". */
export function getRangeLabel(
  range: DateRange,
  locale: string | undefined,
): string {
  return formatDateRange(range, locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
