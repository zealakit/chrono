import assert from "node:assert/strict";
import { test } from "node:test";
import {
  layoutTimeGridEvents,
  normalizeEvents,
} from "../dist/calendar/index.js";
import { toPlainDate } from "../dist/foundation/index.js";
const dayOf = (key: string) => ({ date: toPlainDate(key), key });
const rangeOf = (key: string) => ({
  start: toPlainDate(key),
  end: toPlainDate(key),
});

test("a zoned event across a spring-forward gap lays out in wall time (E9)", () => {
  const key = "2026-03-08";
  const normalized = normalizeEvents(
    [
      {
        id: "A",
        start: "2026-03-08T01:30:00-05:00",
        end: "2026-03-08T03:30:00-04:00",
      },
    ],
    { visibleRange: rangeOf(key), timeZone: "America/New_York" },
  );
  const [segment] = layoutTimeGridEvents(normalized, [dayOf(key)]);
  assert.ok(segment);
  // 01:30 EST → 03:30 EDT is 2 wall hours (02:00–03:00 is skipped).
  assert.equal(segment.top, 1.5 / 24);
  assert.ok(Math.abs(segment.height - 2 / 24) < 1e-12);
});

test("both occurrences of a repeated hour map to the same wall time (E9)", () => {
  const key = "2026-11-01";
  const normalized = normalizeEvents(
    [
      {
        id: "EDT",
        start: "2026-11-01T01:30:00-04:00",
        end: "2026-11-01T05:00:00-05:00",
      },
      {
        id: "EST",
        start: "2026-11-01T01:30:00-05:00",
        end: "2026-11-01T05:00:00-05:00",
      },
    ],
    { visibleRange: rangeOf(key), timeZone: "America/New_York" },
  );
  const segments = layoutTimeGridEvents(normalized, [dayOf(key)]);
  assert.equal(segments.length, 2);
  assert.equal(
    segments.every((s) => s.top === 1.5 / 24),
    true,
  );
  assert.equal(
    segments.every((s) => s.columns === 2),
    true,
  );
});

test("DST days produce finite, in-bounds geometry", () => {
  const cases = [
    {
      key: "2026-03-08",
      zone: "America/New_York",
      start: "2026-03-08T01:00:00-05:00",
      end: "2026-03-08T04:00:00-04:00",
    },
    {
      key: "2026-11-01",
      zone: "America/New_York",
      start: "2026-11-01T00:30:00-04:00",
      end: "2026-11-01T03:00:00-05:00",
    },
    {
      key: "2026-10-04",
      zone: "Australia/Lord_Howe",
      start: "2026-10-04T01:45:00+10:30",
      end: "2026-10-04T03:15:00+11:00",
    },
    {
      key: "2026-04-05",
      zone: "Australia/Lord_Howe",
      start: "2026-04-05T01:15:00+11:00",
      end: "2026-04-05T02:45:00+10:30",
    },
  ];
  for (const c of cases) {
    const normalized = normalizeEvents(
      [{ id: "E", start: c.start, end: c.end }],
      { visibleRange: rangeOf(c.key), timeZone: c.zone },
    );
    const segments = layoutTimeGridEvents(normalized, [dayOf(c.key)]);
    assert.ok(segments.length > 0, c.key);
    for (const segment of segments) {
      assert.ok(Number.isFinite(segment.top), c.key);
      assert.ok(Number.isFinite(segment.height), c.key);
      assert.ok(segment.height >= 0, c.key);
      assert.ok(segment.top + segment.height <= 1 + 1e-9, c.key);
    }
  }
});
