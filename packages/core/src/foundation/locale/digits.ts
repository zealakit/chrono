const cache = new Map<string, readonly string[]>();

/** The ten digit characters a locale writes (`ar-EG` gives Arabic-Indic digits). */
export function getLocaleDigits(locale?: string): readonly string[] {
  const key = locale ?? "";
  let digits = cache.get(key);
  if (!digits) {
    const format = new Intl.NumberFormat(locale, { useGrouping: false });
    digits = Object.freeze(
      Array.from({ length: 10 }, (_, index) => format.format(index)),
    );
    cache.set(key, digits);
  }
  return digits;
}

/** Zero code points of common non-Latin decimal digit blocks. */
const ZEROS = [0x660, 0x6f0, 0x966, 0x9e6, 0xff10] as const;

/** Latin digits for any Arabic-Indic, Persian, Devanagari, Bengali or full-width digit. */
export function toLatinDigits(text: string, locale?: string): string {
  const local = getLocaleDigits(locale);
  let result = "";
  for (const char of text) {
    const index = local.indexOf(char);
    if (index > 0) {
      result += String(index);
      continue;
    }
    const code = char.codePointAt(0) as number;
    const zero = ZEROS.find((start) => code >= start && code < start + 10);
    result += zero === undefined ? char : String(code - zero);
  }
  return result;
}

/** Display a number with the locale's digits. */
export function toLocaleDigits(text: string, locale?: string): string {
  const local = getLocaleDigits(locale);
  return text.replace(/\d/g, (digit) => local[Number(digit)] as string);
}
