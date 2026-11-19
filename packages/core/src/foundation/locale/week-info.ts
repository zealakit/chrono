import type { DayOfWeek, WeekInfo } from "../values/types.js";
import { resolveLocale } from "./resolve.js";

type RawWeekInfo = {
  firstDay: number;
  weekend: number[];
  minimalDays?: number;
};
type WeekLocale = Intl.Locale & {
  getWeekInfo?: () => RawWeekInfo;
  weekInfo?: RawWeekInfo;
};

type Row = readonly [
  regions: string,
  firstDay: DayOfWeek,
  weekend: readonly DayOfWeek[],
];

/**
 * CLDR `weekData` for regions that differ from Monday / Sat-Sun (D12). Used
 * only when the runtime has no `Intl.Locale` week info. A test compares it
 * with `Intl` where available.
 */
const FIRST_DAY_AND_WEEKEND: readonly Row[] = [
  [
    "AG AS BD BR BS BT BU BW BZ CA CO DM DO ET GT GU HK HN ID IS JM JP KE KH KR LA MH MM MO MT MX MZ NI NP PA PE PH PK PR PT PY RH SG SV TH TT TW UM US VE VI WS ZA ZW",
    7,
    [6, 7],
  ],
  ["IL SA YD YE", 7, [5, 6]],
  ["IN", 7, [7]],
  ["BH DZ EG IQ JO KW LY OM QA SD SY", 6, [5, 6]],
  ["DJ", 6, [6, 7]],
  ["AF", 6, [4, 5]],
  ["IR", 6, [5]],
  ["MV", 5, [6, 7]],
  ["UG", 1, [7]],
];

/** Regions whose first week needs 4 days in the year (ISO-like); everyone else uses 1. */
const MINIMAL_DAYS_4 = new Set(
  "AD AN AT AX BE BG CH CZ DE DK EE ES FI FJ FO FR GB GF GG GI GP GR HU IE IM IS IT JE LI LT LU MC MQ NL NO PL RE RU SE SJ SK SM VA".split(
    " ",
  ),
);

const byRegion = new Map<
  string,
  { firstDay: DayOfWeek; weekend: readonly DayOfWeek[] }
>();
function regionTable(): typeof byRegion {
  if (byRegion.size === 0) {
    for (const [regions, firstDay, weekend] of FIRST_DAY_AND_WEEKEND) {
      for (const region of regions.split(" ")) {
        byRegion.set(region, { firstDay, weekend });
      }
    }
  }
  return byRegion;
}

function regionOf(locale: Intl.Locale): string | undefined {
  return locale.region ?? locale.maximize().region;
}

/** The built-in table only, for tests that check it against `Intl`. */
export function getFallbackWeekInfo(region: string | undefined): WeekInfo {
  const row = region ? regionTable().get(region) : undefined;
  return {
    firstDay: row?.firstDay ?? 1,
    weekend: row?.weekend ?? [6, 7],
    minimalDays: region && MINIMAL_DAYS_4.has(region) ? 4 : 1,
  };
}

/** First day, weekend and minimal days of a locale's week (D12). */
export function getWeekInfo(locale?: string): WeekInfo {
  const parsed = new Intl.Locale(resolveLocale(locale)) as WeekLocale;
  const fallback = getFallbackWeekInfo(regionOf(parsed));
  const native = parsed.getWeekInfo?.() ?? parsed.weekInfo;
  if (!native) {
    return fallback;
  }
  return {
    firstDay: native.firstDay as DayOfWeek,
    weekend: native.weekend as DayOfWeek[],
    minimalDays: (native.minimalDays ??
      fallback.minimalDays) as WeekInfo["minimalDays"],
  };
}
