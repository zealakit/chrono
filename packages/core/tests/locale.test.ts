import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getDatePartOrder,
  getDayPeriodNames,
  getHourCycle,
  getMonthNames,
  getTextDirection,
  getWeekInfo,
  getWeekdayNames,
  resolveLocale,
} from "../dist/foundation/index.js";
import { getFallbackWeekInfo } from "../dist/foundation/locale/week-info.js";

test("week info", () => {
  const first = (locale: string) => getWeekInfo(locale).firstDay;
  assert.equal(first("en-US"), 7);
  assert.equal(first("en-GB"), 1);
  assert.equal(first("vi-VN"), 1);
  assert.equal(first("zh-CN"), 1);
  assert.equal(first("ar-EG"), 6);
  assert.equal(first("fa-IR"), 6);
  assert.deepEqual([...getWeekInfo("en-US").weekend], [6, 7]);
  assert.deepEqual([...getWeekInfo("fa-IR").weekend], [5]);
  assert.deepEqual([...getWeekInfo("ar-EG").weekend], [5, 6]);
  assert.equal(getWeekInfo("en-GB").minimalDays, 4);
  assert.equal(getWeekInfo("en-US").minimalDays, 1);
});

test("fallback table agrees with Intl where the runtime has week info", () => {
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  let compared = 0;
  for (let a = 65; a <= 90; a += 1) {
    for (let b = 65; b <= 90; b += 1) {
      const region = String.fromCharCode(a, b);
      let known = false;
      try {
        known = names.of(region) !== region;
      } catch {
        // not a region code
      }
      if (!known) continue;
      const locale = new Intl.Locale(`und-${region}`) as Intl.Locale & {
        getWeekInfo?: () => {
          firstDay: number;
          weekend: number[];
          minimalDays?: number;
        };
      };
      const native = locale.getWeekInfo?.();
      if (!native) continue;
      const fallback = getFallbackWeekInfo(region);
      assert.equal(fallback.firstDay, native.firstDay, `${region} firstDay`);
      assert.deepEqual(
        [...fallback.weekend],
        native.weekend,
        `${region} weekend`,
      );
      if (native.minimalDays !== undefined) {
        assert.equal(
          fallback.minimalDays,
          native.minimalDays,
          `${region} minimalDays`,
        );
      }
      compared += 1;
    }
  }
  if (
    typeof (new Intl.Locale("en-US") as { getWeekInfo?: unknown })
      .getWeekInfo === "function"
  ) {
    assert.ok(compared > 200);
  }
});

test("month and weekday names", () => {
  const months = getMonthNames("en-US", "long");
  assert.equal(months.length, 12);
  assert.equal(months[0], "January");
  assert.equal(months[11], "December");
  assert.equal(getMonthNames("en-US", "short")[8], "Sep");
  assert.equal(getMonthNames("en-US", "narrow")[0], "J");
  assert.equal(getMonthNames("de-DE", "long")[2], "März");
  assert.deepEqual([...getWeekdayNames("en-US", "long", 1)].slice(0, 2), [
    "Monday",
    "Tuesday",
  ]);
  assert.deepEqual([...getWeekdayNames("en-US", "short", 7)].slice(0, 2), [
    "Sun",
    "Mon",
  ]);
  assert.equal(getWeekdayNames("en-US", "long")[0], "Sunday"); // locale first day
  assert.equal(getWeekdayNames("ar-EG", "long").length, 7);
});

test("hour cycle and day periods", () => {
  assert.equal(getHourCycle("en-US"), "h12");
  assert.equal(getHourCycle("vi-VN"), "h23");
  assert.equal(getHourCycle("de-DE"), "h23");
  assert.deepEqual(getDayPeriodNames("en-US"), { am: "AM", pm: "PM" });
});

test("text direction", () => {
  for (const locale of ["ar-EG", "he-IL", "fa-IR", "ur-PK"]) {
    assert.equal(getTextDirection(locale), "rtl", locale);
  }
  for (const locale of ["en-US", "vi-VN", "zh-CN", "ja-JP"]) {
    assert.equal(getTextDirection(locale), "ltr", locale);
  }
});

test("date part order", () => {
  assert.deepEqual(
    [...getDatePartOrder("en-US").order],
    ["month", "day", "year"],
  );
  assert.deepEqual(
    [...getDatePartOrder("vi-VN").order],
    ["day", "month", "year"],
  );
  assert.deepEqual(
    [...getDatePartOrder("zh-CN").order],
    ["year", "month", "day"],
  );
  assert.deepEqual([...getDatePartOrder("en-US").separators], ["/", "/"]);
  assert.equal(getDatePartOrder("ko-KR").suffix.trim(), ".");
});

test("resolveLocale canonicalizes and defaults", () => {
  assert.equal(resolveLocale("EN-us"), "en-US");
  assert.ok(resolveLocale().length > 0);
  assert.throws(() => resolveLocale("not a locale"), RangeError);
});
