import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type EventChangeProposal,
  applyRecurrenceChange,
  applyRecurrenceDelete,
} from "../dist/calendar/index.js";
import {
  parseIsoDateTime,
  toIsoString,
  toZoned,
} from "../dist/foundation/index.js";

const series = {
  id: "s",
  title: "Stand-up",
  start: "2026-11-02T09:00:00",
  end: "2026-11-02T10:00:00",
  rrule: "FREQ=WEEKLY;COUNT=4;BYDAY=MO",
};

const occurrence = parseIsoDateTime("2026-11-16T09:00:00");

const proposal = {
  kind: "move",
  event: series,
  from: {
    start: occurrence,
    end: parseIsoDateTime("2026-11-16T10:00:00"),
    allDay: false,
  },
  to: {
    start: parseIsoDateTime("2026-11-16T10:00:00"),
    end: parseIsoDateTime("2026-11-16T11:00:00"),
    allDay: false,
  },
  source: "pointer",
  recurrence: {
    recurringId: "s",
    occurrenceStart: occurrence,
    isOverride: false,
    series,
  },
} as EventChangeProposal<typeof series>;

test("this occurrence becomes an override without series fields or id", () => {
  const result = applyRecurrenceChange(series, proposal, "this");
  assert.equal(result.series, undefined);
  assert.equal(result.override?.recurringId, "s");
  assert.equal(result.override?.recurrenceId, occurrence);
  assert.equal(result.override?.start, proposal.to.start);
  assert.equal(result.override?.title, "Stand-up");
  assert.equal("id" in (result.override ?? {}), false);
  assert.equal("rrule" in (result.override ?? {}), false);
});

test("following splits COUNT and starts a new series", () => {
  const result = applyRecurrenceChange(series, proposal, "following");
  assert.equal(result.removed, false);
  assert.equal(result.series?.rrule, "FREQ=WEEKLY;COUNT=2;BYDAY=MO");
  assert.equal(result.newSeries?.rrule, "FREQ=WEEKLY;COUNT=2;BYDAY=MO");
  assert.equal(result.newSeries?.start, proposal.to.start);
  assert.equal("id" in (result.newSeries ?? {}), false);
});

test("following from the first occurrence removes the old series", () => {
  const result = applyRecurrenceChange(
    series,
    {
      ...proposal,
      recurrence: {
        ...proposal.recurrence,
        occurrenceStart: parseIsoDateTime("2026-11-02T09:00:00"),
      },
    } as EventChangeProposal<typeof series>,
    "following",
  );
  assert.equal(result.removed, true);
  assert.equal(result.series, undefined);
  assert.equal(result.newSeries?.rrule, "FREQ=WEEKLY;COUNT=4;BYDAY=MO");
});

test("all shifts DTSTART, EXDATEs and stored overrides by the same delta", () => {
  const withExdate = {
    ...series,
    exdates: ["2026-11-23T09:00:00"],
  };
  const result = applyRecurrenceChange(withExdate, proposal, "all", {
    overrideStarts: ["2026-11-09T09:00:00"],
  });
  assert.equal(
    toIsoString(result.series?.start as never),
    "2026-11-02T10:00:00",
  );
  assert.equal(toIsoString(result.series?.end as never), "2026-11-02T11:00:00");
  assert.deepEqual(
    result.overrideIdMap?.map((entry) => entry.from.day),
    [9],
  );
  assert.ok(result.overrideIdMap?.[0]?.to);
});

test("delete this adds an EXDATE and names the override to remove", () => {
  const result = applyRecurrenceDelete(series, occurrence, "this");
  assert.equal(result.removed, undefined);
  assert.equal(
    (result.series as { exdates?: unknown[] } | undefined)?.exdates?.length,
    1,
  );
  assert.equal(result.removedOverrideRecurrenceId, occurrence);
});

test("delete following ends the series; delete all removes it", () => {
  const following = applyRecurrenceDelete(series, occurrence, "following");
  assert.equal(following.removed, false);
  assert.equal(following.series?.rrule, "FREQ=WEEKLY;COUNT=2;BYDAY=MO");
  const all = applyRecurrenceDelete(series, occurrence, "all");
  assert.equal(all.removed, true);
  assert.equal(all.series, undefined);
});

test("following uses an instant UNTIL for a zoned series", () => {
  const zone = "America/New_York";
  const zoned = {
    id: "z",
    start: toZoned(parseIsoDateTime("2026-03-01T09:00:00"), zone),
    end: toZoned(parseIsoDateTime("2026-03-01T10:00:00"), zone),
    rrule: "FREQ=WEEKLY",
  };
  const result = applyRecurrenceChange(
    zoned,
    {
      ...proposal,
      event: zoned,
      recurrence: {
        recurringId: "z",
        occurrenceStart: parseIsoDateTime("2026-03-15T09:00:00"),
        isOverride: false,
        series: zoned,
      },
    } as never,
    "following",
    { timeZone: zone },
  );
  const rule = result.series?.rrule;
  assert.equal(typeof rule, "string");
  assert.match(String(rule), /UNTIL=\d{8}T\d{6}Z/);
});

test("all: resizing the end changes the series duration, not its start", () => {
  const resize = {
    ...proposal,
    kind: "resize-end",
    to: {
      start: proposal.from.start,
      end: parseIsoDateTime("2026-11-16T11:30:00"),
      allDay: false,
    },
  } as EventChangeProposal<typeof series>;
  const result = applyRecurrenceChange(series, resize, "all");
  assert.equal(
    toIsoString(result.series?.start as never).slice(0, 19),
    "2026-11-02T09:00:00",
  );
  assert.equal(
    toIsoString(result.series?.end as never).slice(0, 19),
    "2026-11-02T11:30:00",
  );
});

test("following: an EXDATE does not shift the COUNT split", () => {
  const withExdate = { ...series, exdates: ["2026-11-09T09:00:00"] };
  const result = applyRecurrenceChange(withExdate, proposal, "following");
  // Occurrences are Nov 2, 9, 16, 23; the edit is the 3rd, so two come before it.
  assert.equal(result.series?.rrule, "FREQ=WEEKLY;COUNT=2;BYDAY=MO");
  assert.equal(
    (result.newSeries as { rrule: string }).rrule,
    "FREQ=WEEKLY;COUNT=2;BYDAY=MO",
  );
});
