import assert from "node:assert/strict";
import { test } from "node:test";
import {
  layoutTimeGridEvents,
  normalizeEvents,
} from "../dist/calendar/index.js";
import { plainDate } from "../dist/foundation/index.js";
import { mulberry32, packTimeGridColumns } from "./support/oracle.ts";

const pad = (n: number) => String(n).padStart(2, "0");

test("time-grid columns match the oracle on 1,000 seeded sets", () => {
  const rand = mulberry32(0xc0ffee);
  const day = { date: plainDate(2026, 11, 17), key: "2026-11-17" };
  const range = {
    start: plainDate(2026, 11, 17),
    end: plainDate(2026, 11, 17),
  };
  for (let set = 0; set < 1000; set += 1) {
    const n = 1 + Math.floor(rand() * 10);
    const events: { id: string; start: string; end: string }[] = [];
    for (let i = 0; i < n; i += 1) {
      const hour = Math.floor(rand() * 20);
      const length = 1 + Math.floor(rand() * 4);
      const minute = Math.floor(rand() * 60);
      events.push({
        id: `e${i}`,
        start: `2026-11-17T${pad(hour)}:${pad(minute)}`,
        end: `2026-11-17T${pad(hour + length)}:${pad(minute)}`,
      });
    }

    const segments = layoutTimeGridEvents(
      normalizeEvents(events, { visibleRange: range }),
      [day],
    );

    const ordered = events
      .map((event) => {
        const start = event.start.slice(11, 13);
        const minute = event.start.slice(14, 16);
        const end = event.end.slice(11, 13);
        return {
          id: event.id,
          start: Number(start) * 3600 + Number(minute) * 60,
          end: Number(end) * 3600 + Number(minute) * 60,
        };
      })
      .sort(
        (a, b) =>
          a.start - b.start ||
          b.end - b.start - (a.end - a.start) ||
          (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
      );

    const oracle = packTimeGridColumns(
      ordered.map((o) => ({ start: o.start, end: o.end })),
    );
    const byId = new Map(ordered.map((o, i) => [o.id, oracle[i]]));

    for (const segment of segments) {
      const expected = byId.get(String(segment.event.id));
      assert.ok(expected, `set ${set}: no oracle for ${segment.event.id}`);
      assert.equal(segment.column, expected.column, `set ${set}`);
      assert.equal(segment.columns, expected.columns, `set ${set}`);
      assert.equal(segment.span, expected.span, `set ${set}`);
    }
  }
});
