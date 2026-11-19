import assert from "node:assert/strict";
import { test } from "node:test";
import {
  defaultMessages,
  getDateLabel,
  getRangeLabel,
  getTimeLabel,
  mergeMessages,
  plainDate,
  plainTime,
} from "../dist/foundation/index.js";

const norm = (text: string) => text.replace(/[   ]/g, " ");
const date = plainDate(2026, 11, 17);

test("date labels for en-US with each status", () => {
  assert.equal(getDateLabel(date, "en-US"), "Tuesday, November 17, 2026");
  assert.equal(
    getDateLabel(date, "en-US", { today: true, selected: true }),
    "Tuesday, November 17, 2026, today, selected",
  );
  assert.equal(
    getDateLabel(date, "en-US", { unavailable: true }),
    "Tuesday, November 17, 2026, unavailable",
  );
  assert.equal(
    getDateLabel(date, "en-US", { disabled: true }),
    "Tuesday, November 17, 2026, disabled",
  );
  assert.equal(
    getDateLabel(date, "en-US", { rangeStart: true, selected: true }),
    "Tuesday, November 17, 2026, range start, selected",
  );
  assert.equal(
    getDateLabel(date, "en-US", { rangeEnd: true }),
    "Tuesday, November 17, 2026, range end",
  );
  assert.equal(
    getDateLabel(date, "en-US", { inRange: true }),
    "Tuesday, November 17, 2026, in range",
  );
});

test("message overrides", () => {
  const vi = mergeMessages(defaultMessages, {
    today: "hôm nay",
    selected: "đã chọn",
  });
  assert.equal(vi.unavailable, "unavailable");
  assert.equal(
    getDateLabel(date, "vi-VN", { today: true, selected: true }, vi).endsWith(
      ", hôm nay, đã chọn",
    ),
    true,
  );
  assert.deepEqual(mergeMessages(defaultMessages), { ...defaultMessages });
  assert.deepEqual(mergeMessages(defaultMessages, { today: undefined }), {
    ...defaultMessages,
  });
});

test("time and range labels", () => {
  assert.equal(norm(getTimeLabel(plainTime(15, 30), "en-US")), "3:30 PM");
  assert.equal(
    norm(getTimeLabel(plainTime(15, 30), "en-US", { selected: true })),
    "3:30 PM, selected",
  );
  assert.equal(norm(getTimeLabel(plainTime(15, 30, 5), "en-US")), "3:30:05 PM");
  assert.match(
    norm(getRangeLabel({ start: date, end: plainDate(2026, 11, 20) }, "en-US")),
    /^November 17\s?[–-]\s?20, 2026$/,
  );
});
