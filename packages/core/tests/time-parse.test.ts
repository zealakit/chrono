import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseTime } from "../dist/time/index.js";
import { toIsoString } from "../dist/foundation/index.js";

const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/time-parse.json", import.meta.url), "utf8"),
) as { cases: { locale: string; input: string; result: string }[] };

for (const { locale, input, result } of fixture.cases) {
  test(`parse ${locale} "${input}"`, () => {
    const parsed = parseTime(input, { locale });
    assert.equal(
      "time" in parsed ? toIsoString(parsed.time) : parsed.error,
      result,
    );
  });
}
