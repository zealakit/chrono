import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatDate,
  formatDateRange,
  formatDateTime,
  formatTime,
  plainDate,
  plainDateTime,
  plainTime,
} from "../dist/foundation/index.js";

const norm = (text: string) => text.replace(/[   ]/g, " ");

test("plain values format the same in every TZ (no shift)", () => {
  // The suite runs once per TZ; these constants must hold in each.
  assert.equal(formatDate(plainDate(2026, 11, 17), "en-US"), "11/17/2026");
  assert.equal(
    formatDate(plainDate(2026, 1, 1), "en-US", { dateStyle: "full" }),
    "Thursday, January 1, 2026",
  );
  assert.equal(norm(formatTime(plainTime(15, 30), "en-US")), "3:30 PM");
  assert.equal(
    formatTime(plainTime(0, 5), "de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    "00:05",
  );
  assert.equal(
    norm(
      formatDateTime(
        plainDateTime(plainDate(2026, 3, 8), plainTime(2, 30)),
        "en-US",
      ),
    ),
    "3/8/2026, 2:30 AM",
  );
  assert.equal(
    formatDate(plainDate(2026, 3, 8), "en-US", {
      month: "long",
      day: "numeric",
    }),
    "March 8",
  );
});

test("always Gregorian", () => {
  assert.match(
    formatDate(plainDate(2026, 11, 17), "th-TH", { year: "numeric" }),
    /2026|๒๐๒๖/,
  );
  assert.match(
    formatDate(plainDate(2026, 11, 17), "ar-SA", { year: "numeric" }),
    /2026|٢٠٢٦/,
  );
});

test("ranges", () => {
  const text = norm(
    formatDateRange(
      { start: plainDate(2026, 11, 17), end: plainDate(2026, 11, 20) },
      "en-US",
      { year: "numeric", month: "long", day: "numeric" },
    ),
  );
  assert.match(text, /^November 17\s?[–-]\s?20, 2026$/);
});
