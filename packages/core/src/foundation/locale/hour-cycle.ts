import { getFormatter } from "./resolve.js";

/** `h11`/`h12` fold into `"h12"`, `h23`/`h24` into `"h23"`. */
export function getHourCycle(locale?: string): "h12" | "h23" {
  const formatter = getFormatter(locale, { hour: "numeric", timeZone: "UTC" });
  const cycle = formatter.resolvedOptions().hourCycle;
  if (cycle === "h11" || cycle === "h12") {
    return "h12";
  }
  if (cycle === "h23" || cycle === "h24") {
    return "h23";
  }
  return formatter.formatToParts(0).some((part) => part.type === "dayPeriod")
    ? "h12"
    : "h23";
}

/** Localized AM and PM markers. */
export function getDayPeriodNames(locale?: string): { am: string; pm: string } {
  const formatter = getFormatter(locale, {
    hour: "numeric",
    hourCycle: "h12",
    timeZone: "UTC",
  });
  const period = (hour: number): string =>
    formatter
      .formatToParts(hour * 3600000)
      .find((part) => part.type === "dayPeriod")?.value ?? "";
  return { am: period(1), pm: period(13) };
}

/**
 * The day-period words around a time ("in the morning"), from `Intl`; falls back
 * to the AM/PM names for locales that have no flexible day periods.
 */
export function getDayPeriodLabel(hour: number, locale?: string): string {
  const formatter = getFormatter(locale, {
    hour: "numeric",
    dayPeriod: "long",
    timeZone: "UTC",
  });
  const part = formatter
    .formatToParts(hour * 3600000)
    .find((item) => item.type === "dayPeriod")?.value;
  if (part) return part;
  const names = getDayPeriodNames(locale);
  return hour < 12 ? names.am : names.pm;
}
