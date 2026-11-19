import { resolveLocale } from "./resolve.js";

type TextLocale = Intl.Locale & {
  getTextInfo?: () => { direction: string };
  textInfo?: { direction: string };
};

const RTL_SCRIPTS = new Set([
  "Arab",
  "Hebr",
  "Thaa",
  "Syrc",
  "Nkoo",
  "Adlm",
  "Rohg",
  "Mand",
  "Samr",
]);
const RTL_LANGUAGES = new Set([
  "ar",
  "he",
  "fa",
  "ur",
  "ps",
  "sd",
  "ug",
  "yi",
  "dv",
  "ckb",
  "ku",
]);

export function getTextDirection(locale?: string): "ltr" | "rtl" {
  const parsed = new Intl.Locale(resolveLocale(locale)) as TextLocale;
  const direction =
    parsed.getTextInfo?.().direction ?? parsed.textInfo?.direction;
  if (direction === "rtl" || direction === "ltr") {
    return direction;
  }
  const script = parsed.script ?? parsed.maximize().script;
  if (script) {
    return RTL_SCRIPTS.has(script) ? "rtl" : "ltr";
  }
  return RTL_LANGUAGES.has(parsed.language) ? "rtl" : "ltr";
}
