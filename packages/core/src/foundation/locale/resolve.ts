/** Internal: locale resolution and a lazy `Intl.DateTimeFormat` cache (plan 03 §3.2). */
const formatters = new Map<string, Intl.DateTimeFormat>();

function runtimeLocale(): string {
  return new Intl.DateTimeFormat().resolvedOptions().locale;
}

/**
 * Canonical BCP 47 tag. `undefined` means the runtime default (D11); SSR apps
 * should pass a locale explicitly because server and browser defaults differ.
 */
export function resolveLocale(locale?: string): string {
  if (locale === undefined || locale === "") {
    return runtimeLocale();
  }
  return Intl.getCanonicalLocales(locale)[0] ?? runtimeLocale();
}

/** Cached formatter. Always Gregorian: Chrono has no other calendars in v1. */
export function getFormatter(
  locale: string | undefined,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const resolved = resolveLocale(locale);
  const key = `${resolved}|${JSON.stringify(options)}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(resolved, {
      ...options,
      calendar: "gregory",
    });
    formatters.set(key, formatter);
  }
  return formatter;
}
