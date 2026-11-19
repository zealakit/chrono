import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseDate, resolveTwoDigitYear } from "../dist/date/index.js";
import { parseIsoDate, toIsoString } from "../dist/foundation/index.js";

const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/date-parse.json", import.meta.url), "utf8"),
) as {
  now: string;
  cases: { locale: string; input: string; result: string }[];
};

for (const { locale, input, result } of fixture.cases) {
  test(`parse ${locale} "${input}"`, () => {
    const parsed = parseDate(input, {
      locale,
      today: parseIsoDate(fixture.now),
    });
    assert.equal(
      "date" in parsed ? toIsoString(parsed.date) : parsed.error,
      result,
    );
  });
}

test("two-digit years: nearest within 50 years, ties go to the past", () => {
  assert.equal(resolveTwoDigitYear(75, 2026), 2075);
  assert.equal(resolveTwoDigitYear(76, 2026), 1976);
  assert.equal(resolveTwoDigitYear(77, 2026), 1977);
  assert.equal(resolveTwoDigitYear(26, 2026), 2026);
});
