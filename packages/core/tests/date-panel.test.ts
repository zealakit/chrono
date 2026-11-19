import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createDatePanelController,
  createDateRangePanelController,
  createMultiDatePanelController,
} from "../dist/date/index.js";
import { plainDate } from "../dist/foundation/index.js";

const NOW = Date.UTC(2026, 10, 17, 12);
const base = {
  locale: "en-US",
  timeZone: "UTC",
  now: NOW,
  weekStartsOn: 1 as const,
};
const d = (m: number, day: number, y = 2026) => plainDate(y, m, day);
const keys = { shift: false, ctrl: false, meta: false };
const iso = (
  x: { year: number; month: number; day: number } | null | undefined,
) =>
  x
    ? `${x.year}-${String(x.month).padStart(2, "0")}-${String(x.day).padStart(2, "0")}`
    : null;
const cells = (
  c: { getState(): { months: { weeks: { days: any[] }[] }[] } },
  month = 0,
) => c.getState().months[month]?.weeks.flatMap((w) => w.days) ?? [];

test("single: title, focus on today, pick commits once", () => {
  const changes: unknown[] = [];
  const commits: unknown[] = [];
  const c = createDatePanelController({
    ...base,
    onValueChange: (v) => changes.push(iso(v)),
    onValueCommit: (v) => commits.push(iso(v)),
  });
  assert.equal(c.getState().title, "November 2026");
  assert.equal(iso(c.getState().focusedDate), "2026-11-17");
  c.pick(d(11, 20), "pointer");
  assert.deepEqual(changes, ["2026-11-20"]);
  assert.deepEqual(commits, ["2026-11-20"]);
  assert.equal(cells(c).find((x) => x.selected)?.key, "2026-11-20");
});

test("single: disabled and unavailable days cannot be picked", () => {
  const c = createDatePanelController({
    ...base,
    isDateDisabled: (x) => x.day === 5,
    isDateUnavailable: (x) => x.day === 6,
  });
  c.pick(d(11, 5), "pointer");
  c.pick(d(11, 6), "pointer");
  assert.equal(c.getState().value, null);
  const five = cells(c).find((x) => x.key === "2026-11-05");
  assert.equal(c.getCellAttributes(five)["aria-disabled"], "true");
});

test("controlled null stays null until the app updates it", () => {
  const seen: unknown[] = [];
  const c = createDatePanelController({
    ...base,
    value: null,
    onValueChange: (v) => seen.push(iso(v)),
  });
  c.pick(d(11, 3), "pointer");
  assert.equal(c.getState().value, null);
  assert.deepEqual(seen, ["2026-11-03"]);
  c.setOptions({ value: d(11, 3) });
  assert.equal(iso(c.getState().value as never), "2026-11-03");
});

test("panel follows an outside value (A9) unless followValue is false", () => {
  const c = createDatePanelController({ ...base, value: null });
  c.setOptions({ value: d(3, 9, 2027) });
  assert.equal(c.getState().title, "March 2027");
  const frozen = createDatePanelController({
    ...base,
    value: null,
    followValue: false,
  });
  frozen.setOptions({ value: d(3, 9, 2027) });
  assert.equal(frozen.getState().title, "November 2026");
});

test("keyboard: arrows move focus, paging crosses months, Enter picks", () => {
  const c = createDatePanelController(base);
  c.handleKeyDown("ArrowRight", keys);
  assert.equal(iso(c.getState().focusedDate), "2026-11-18");
  c.handleKeyDown("ArrowDown", keys);
  assert.equal(iso(c.getState().focusedDate), "2026-11-25");
  c.handleKeyDown("PageDown", keys);
  assert.equal(c.getState().title, "December 2026");
  assert.equal(c.handleKeyDown("Enter", keys), true);
  assert.equal(iso(c.getState().value as never), "2026-12-25");
  assert.equal(c.handleKeyDown("Escape", keys), false);
});

test("RTL swaps the horizontal arrows", () => {
  const c = createDatePanelController({ ...base, locale: "ar-EG" });
  c.handleKeyDown("ArrowRight", keys);
  assert.equal(iso(c.getState().focusedDate), "2026-11-16");
});

test("levels: Ctrl+Up goes up, picking a month goes back down", () => {
  const c = createDatePanelController(base);
  assert.equal(c.handleKeyDown("ArrowUp", { ...keys, ctrl: true }), true);
  assert.equal(c.getState().level, "month");
  assert.equal(c.getState().title, "2026");
  assert.equal(c.getState().cells.length, 12);
  c.handleKeyDown("ArrowUp", { ...keys, ctrl: true });
  assert.equal(c.getState().level, "year");
  assert.equal(c.getState().title, "2020 – 2029");
  c.pick(d(1, 1, 2028), "pointer");
  assert.equal(c.getState().level, "month");
  c.pick(d(5, 1, 2028), "pointer");
  assert.equal(c.getState().level, "day");
  assert.equal(c.getState().title, "May 2028");
});

test("minLevel and maxLevel limit the levels", () => {
  const c = createDatePanelController({ ...base, maxLevel: "month" });
  c.setLevel("year");
  assert.equal(c.getState().level, "month");
  assert.equal(c.getState().canGoUp, false);
});

test("min/max block paging and key moves", () => {
  const c = createDatePanelController({
    ...base,
    min: "2026-11-10",
    max: "2026-11-25",
  });
  assert.equal(c.getState().canGoPrev, false);
  assert.equal(c.getState().canGoNext, false);
  c.handleKeyDown("End", keys);
  assert.ok(iso(c.getState().focusedDate)! <= "2026-11-25");
});

test("range: draft, preview, blocked days, commit", () => {
  const commits: unknown[] = [];
  const previews: unknown[] = [];
  const c = createDateRangePanelController({
    ...base,
    maxDays: 4,
    onValueCommit: (v) => commits.push(`${iso(v.start)}..${iso(v.end)}`),
    onRangePreviewChange: (p) =>
      previews.push(p ? `${iso(p.start)}..${iso(p.end)}` : null),
  });
  c.pick(d(11, 10), "pointer");
  assert.equal(c.getState().draft, true);
  assert.deepEqual(commits, []);
  const blocked = cells(c)
    .filter((x) => x.blocked)
    .map((x) => x.key);
  assert.ok(blocked.includes("2026-11-20"));
  assert.ok(!blocked.includes("2026-11-12"));
  c.setPreview(d(11, 12));
  assert.deepEqual(previews.at(-1), "2026-11-10..2026-11-12");
  c.setPreview(d(11, 20));
  assert.equal(c.getState().preview, null);
  c.pick(d(11, 20), "pointer");
  assert.equal(c.getState().draft, true);
  c.pick(d(11, 12), "pointer");
  assert.deepEqual(commits, ["2026-11-10..2026-11-12"]);
  const attrs = c.getCellAttributes(
    cells(c).find((x) => x.key === "2026-11-11"),
  );
  assert.equal(attrs["data-in-range"], true);
});

test("range: Escape cancels a draft and restores the previous range", () => {
  const c = createDateRangePanelController({
    ...base,
    defaultValue: { start: d(11, 1), end: d(11, 3) },
  });
  c.pick(d(11, 9), "pointer");
  assert.equal(c.getState().draft, true);
  assert.equal(c.handleKeyDown("Escape", keys), true);
  assert.equal(c.getState().draft, false);
  assert.equal(
    iso((c.getState().value as never as { end: never }).end),
    "2026-11-03",
  );
  assert.equal(c.handleKeyDown("Escape", keys), false);
});

test("range: invalid pick reports the reason and changes nothing", () => {
  const reasons: unknown[] = [];
  const c = createDateRangePanelController({
    ...base,
    minDays: 3,
    onInvalidRange: (r) => reasons.push(r),
  });
  c.pick(d(11, 10), "pointer");
  c.pick(d(11, 11), "pointer");
  assert.deepEqual(reasons, ["too-short"]);
  assert.equal(c.getState().draft, true);
});

test("range: two months, outside days hidden, pageBy visible", () => {
  const c = createDateRangePanelController({
    ...base,
    months: 2,
    pageBy: "visible",
  });
  assert.equal(c.getState().months.length, 2);
  assert.equal(
    c.getState().title.replace(/\s/g, " "),
    "November – December 2026",
  );
  const first = cells(c, 0);
  assert.ok(first.some((x) => x.hidden));
  assert.equal(
    new Set(
      cells(c, 0)
        .concat(cells(c, 1))
        .filter((x) => !x.hidden)
        .map((x) => x.key),
    ).size,
    cells(c, 0)
      .concat(cells(c, 1))
      .filter((x) => !x.hidden).length,
  );
  c.next();
  assert.equal(
    c.getState().title.replace(/\s/g, " "),
    "January – February 2027",
  );
});

test("multi: toggle, shift-add, maxSelected marks the rest blocked", () => {
  const c = createMultiDatePanelController({ ...base, maxSelected: 3 });
  c.pick(d(11, 2), "pointer");
  c.focusDate(d(11, 4));
  assert.equal(c.handleKeyDown("Enter", { ...keys, shift: true }), true);
  assert.equal((c.getState().value as unknown[]).length, 3);
  assert.equal(c.getState().count, 3);
  assert.equal(cells(c).find((x) => x.key === "2026-11-09")?.blocked, true);
  c.pick(d(11, 3), "pointer");
  assert.equal((c.getState().value as unknown[]).length, 2);
});

test("attribute contract", () => {
  const range = createDateRangePanelController(base);
  assert.equal(range.getRootAttributes()["data-chrono-date-panel"], "range");
  assert.equal(range.getGridAttributes()["aria-multiselectable"], "true");
  const single = createDatePanelController(base);
  assert.equal(single.getRootAttributes()["data-chrono-date-panel"], true);
  assert.equal(single.getGridAttributes()["aria-multiselectable"], undefined);
  const today = cells(single).find((x) => x.today);
  const attrs = single.getCellAttributes(today);
  assert.equal(attrs["aria-current"], "date");
  assert.equal(attrs.tabindex, 0);
  for (const key of Object.keys(attrs)) {
    assert.ok(!["class", "style"].includes(key) && !key.startsWith("on"), key);
  }
});

test("today() jumps back and selectToday picks it", () => {
  const c = createDatePanelController({
    ...base,
    selectToday: true,
    defaultVisibleMonth: { year: 2030, month: 1 },
  });
  c.today();
  assert.equal(c.getState().title, "November 2026");
  assert.equal(iso(c.getState().value as never), "2026-11-17");
});

test("readOnly and disabled", () => {
  const ro = createDatePanelController({ ...base, readOnly: true });
  ro.pick(d(11, 3), "pointer");
  assert.equal(ro.getState().value, null);
  assert.equal(iso(ro.getState().focusedDate), "2026-11-03");
  const off = createDatePanelController({ ...base, disabled: true });
  assert.equal(off.handleKeyDown("ArrowRight", keys), false);
});
