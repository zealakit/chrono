import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getBuiltInViews,
  getCalendarTitle,
  getRange,
} from "../dist/calendar/index.js";
import { plainDate } from "../dist/foundation/index.js";

const views = getBuiltInViews([6, 7]);
const norm = (text: string) => text.replace(/[   ]/g, " ");
const title = (
  view: string,
  locale: string,
  anchor = plainDate(2026, 11, 17),
) => {
  const definition = views[view] as never;
  return getCalendarTitle(
    getRange(definition, anchor, { weekStartsOn: 1 }),
    definition,
    locale,
  );
};

test("en-US titles for every layout", () => {
  assert.equal(norm(title("month", "en-US").text), "November 2026");
  assert.equal(norm(title("week", "en-US").text), "Nov 16 – 22, 2026");
  assert.equal(norm(title("day", "en-US").text), "Tuesday, November 17, 2026");
  assert.equal(norm(title("agenda", "en-US").text), "Nov 17 – 23, 2026");
  assert.equal(norm(title("multiMonth", "en-US").text), "Nov 2026 – Jan 2027");
});

test("month and year boundaries", () => {
  assert.equal(
    norm(title("week", "en-US", plainDate(2026, 12, 30)).text),
    "Dec 28, 2026 – Jan 3, 2027",
  );
  assert.equal(
    norm(title("week", "en-US", plainDate(2026, 10, 29)).text),
    "Oct 26 – Nov 1, 2026",
  );
  assert.equal(
    norm(title("month", "en-US", plainDate(2026, 12, 31)).text),
    "December 2026",
  );
});

test("other locales", () => {
  assert.match(title("month", "vi-VN").text, /11/);
  assert.match(title("month", "vi-VN").text, /2026/);
  assert.match(title("month", "zh-CN").text, /2026/);
  assert.match(title("month", "zh-CN").text, /11/);
  assert.equal(title("month", "de-DE").text, "November 2026");
  assert.ok(title("day", "ar-EG").text.length > 5);
  assert.ok(title("week", "ar-EG").text.length > 5);
});

test("parts reassemble into text and expose the pieces", () => {
  for (const view of ["month", "week", "day", "multiMonth"]) {
    const result = title(view, "en-US");
    assert.equal(result.parts.map((part) => part.value).join(""), result.text);
  }
  const month = title("month", "en-US");
  assert.deepEqual(
    month.parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
    [
      ["month", "November"],
      ["year", "2026"],
    ],
  );
});
