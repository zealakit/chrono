import { toLatinDigits } from "../locale/digits.js";

export type Token =
  | { type: "number"; text: string; value: number }
  | { type: "word"; text: string }
  | { type: "separator"; text: string };

/**
 * Split text into numbers, words and separators. Digits of any supported
 * script count as numbers; every other character (including the CJK date
 * marks 年月日) separates.
 */
export function tokenize(text: string, locale?: string): Token[] {
  const tokens: Token[] = [];
  const pattern = /(\d+)|(\p{L}[\p{L}\p{M}'’.]*)|([^\d\p{L}]+)/gu;
  for (const match of toLatinDigits(text, locale).matchAll(pattern)) {
    if (match[1] !== undefined) {
      tokens.push({ type: "number", text: match[1], value: Number(match[1]) });
    } else if (match[2] !== undefined && !/^[年月日]$/u.test(match[2])) {
      tokens.push({ type: "word", text: match[2].replace(/\.$/, "") });
    } else {
      tokens.push({ type: "separator", text: match[0] });
    }
  }
  return tokens;
}

/** Lower-case and strip accents, so `März` matches `marz`. */
export const fold = (text: string): string =>
  text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
