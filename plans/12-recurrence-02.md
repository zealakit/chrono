# Plan: stage 5d — Recurring events (`/calendar`) — part 2 of 2

> Part 2 of 2 of [`12-recurrence.md`](12-recurrence.md) (the index: scope, status and the part table). Section numbers (`§N`) are unchanged by the split. Shared rules: [`00-conventions-as-built.md`](00-conventions-as-built.md).

## 13. Implementation guide (added after stages 1–2 shipped)

Read [`00-conventions-as-built.md`](00-conventions-as-built.md) and the guides of plans 05, 09 and 10 first (this plan reuses
the **data-driven pack** mechanism of 10 §13 IG1–IG3 and the normalize/memoization rules of 05 §13). Decisions RR1–RR10 stay
unless a bullet below says otherwise.

### 13.1 Reconciliations with the as-built code

| # | Problem | Resolution |
| --- | --- | --- |
| R1 | **"Registry" again implies a global.** §2.1 says `normalize.ts` has a hook "if a recurrence pack is registered". | No registry. The pack is a plain **value** passed as the `recurrence` option; `normalize` receives `options.recurrence?.expand` and calls it only when present, so `recurrence/` is imported **only** by the pack module (`recurrence/pack.ts`, no top-level side effects) and by the utility exports. Same bundle test as 10 IG2: bundling an entry that imports only `Calendar` must not include any `calendar/recurrence/` input; the entry that also imports `recurrence` must. |
| R2 | **`recurringId` already exists** (05 E21: pre-expanded occurrences carry it, shown as `data-recurring`). | Keep its meaning ("this piece belongs to series X"). Series events are identified by their own `id`; overrides (RR6) carry `recurringId = series.id` **and** `recurrenceId`. Pre-expanded occurrences without `recurrenceId` remain plain events that merely carry `recurringId`. Document the three event kinds in one table in the README: plain, series (`rrule`), override (`recurringId` + `recurrenceId`). |
| R3 | **State equality.** Occurrence pieces hold the series/override object by reference. | Same rule as 05 R1: segments are compared through memoized layout arrays; the expansion cache must therefore return the **same array** for the same inputs. |
| R4 | **Size entries.** "with recurrence" and "with both packs". | Synthetic `check-size` entries as in 10 IG3 (named imports `Calendar`, `recurrence`, plus `resourceViews` for the combined entry). Budgets: +6 KB on top of the configuration they extend (§5); measure and record. |
| R5 | **Errors must not spam.** `onRecurrenceError` could fire on every render. | Fire once per (series object identity, error code); keep a `WeakMap<series, Set<code>>` inside the controller. |
| R6 | **Server use of the utilities.** `expandRecurrence` etc. must work without DOM/React. | They live in `calendar/recurrence/` and import only foundation (zoned values, `addDays`, …); no `isBrowser` branches. The adapters re-export them from a **directive-free** module (like `utilities.ts`), so React Server Components can call them (the Next.js example proves it in `next build`). |

### 13.2 Specs the plan leaves open

**Types.** `RRule = { freq: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY"; interval?: number (≥ 1); count?: number (≥ 1);
until?: PlainDate | PlainDateTime | ZonedDateTime; byDay?: { day: DayOfWeek; ordinal?: number }[]; byMonthDay?: number[]
(−31…−1, 1…31); byMonth?: number[] (1…12); wkst?: DayOfWeek }`. `parseRRule` accepts the RFC value string without the
`RRULE:` prefix (also tolerates it) and rejects unknown/unsupported parts with `RRuleError { code, part }` where `code ∈
"unsupported-part" | "invalid-value" | "conflict"` (`COUNT` together with `UNTIL` is a `conflict`, RFC forbids it).
`stringifyRRule` emits parts in the fixed order `FREQ, INTERVAL, COUNT, UNTIL, BYMONTH, BYMONTHDAY, BYDAY, WKST`; round trip
`parse(stringify(r))` deep-equals `r`. `UNTIL` formats: `YYYYMMDD` (date), `YYYYMMDDTHHMMSS` (floating), `YYYYMMDDTHHMMSSZ`
(UTC). Comparison rule: a **date-only** `UNTIL` includes every occurrence whose date (in the event zone) is ≤ it; a UTC
`UNTIL` is compared as an instant for zoned events and as wall time for plain ones.

**Occurrence generation (`expand.ts`).** DTSTART always counts as the first occurrence (RFC 5545 §3.8.5.3) even when it does
not match the BY rules, and counts toward `COUNT`. Then, per frequency, iterate **periods** and expand/filter inside them:

- `DAILY`: day = dtstart + k·interval; keep when BYMONTH/BYMONTHDAY/BYDAY match.
- `WEEKLY`: period k = the week (aligned by `WKST`, default Monday) of dtstart advanced by `k·interval` weeks; occurrences are
  the `BYDAY` days of that week (default: dtstart's weekday), sorted; days before dtstart in the first period are skipped.
- `MONTHLY`: month = dtstart's month + k·interval. Days = `BYMONTHDAY` (default dtstart's day) **or** `BYDAY` with ordinals
  (`2TU`, `-1FR`; without ordinal = every such weekday); when both are present `BYDAY` filters the `BYMONTHDAY` set
  (Friday the 13th). Dates that do not exist (31st in a 30-day month) are skipped, never clamped.
- `YEARLY`: year = dtstart's year + k·interval; months from `BYMONTH` (default dtstart's month); inside each month apply
  `BYMONTHDAY` (default dtstart's day) or `BYDAY` as in monthly. **Ordinal `BYDAY` without `BYMONTH`** (e.g. "20th Monday of
  the year") is outside the subset → `unsupported-part`.
- Time of day = **wall time of DTSTART**; zoned series resolve each occurrence with `toZoned(date + time, zone,
  "compatible")` (a 09:00 series stays 09:00 across DST; a 02:30 series on a spring-forward day becomes 03:30).
- Stop at `COUNT`, `UNTIL`, the end of the requested range, or the 10,000-iteration cap (development warning,
  `onRecurrenceError(event, { code: "iteration-cap" })`).

**Range-limited expansion (RR5).** Rules **without** `COUNT` jump to the first period overlapping `rangeStart − duration`
(compute with arithmetic on periods: whole intervals of days/weeks/months/years between dtstart and the range start), then
iterate to `rangeEnd`. Rules with `COUNT` iterate from dtstart (capped). Test equality: `expand(range)` equals
`expand(wide range)` clipped to `range` for 1,000 seeded rules.

**Worked golden examples (copy the exact expected lists from RFC 5545 §3.8.5.3 into `rfc-examples.test.ts`; the ones below
are the cases to cover, the RFC is the source of truth).** All with DTSTART `1997-09-02 09:00 America/New_York` unless noted:

| rule | what it proves |
| --- | --- |
| `FREQ=DAILY;COUNT=10` | COUNT, consecutive days across a month end |
| `FREQ=DAILY;INTERVAL=2` (range-limited) | interval jumps |
| `FREQ=WEEKLY;COUNT=10` | weekly stepping (9/2, 9/9 … 11/4) and the **EDT → EST change on 1997-10-26 keeps 09:00** |
| `FREQ=WEEKLY;INTERVAL=2;COUNT=4;BYDAY=TU,SU;WKST=MO` (DTSTART 1997-08-05) | 8/5, 8/10, 8/19, 8/24 |
| same with `WKST=SU` | 8/5, 8/17, 8/19, 8/31 (WKST changes the result) |
| `FREQ=MONTHLY;COUNT=10;BYDAY=1FR` (DTSTART 1997-09-05) | first Friday; crosses a year |
| `FREQ=MONTHLY;COUNT=6;BYDAY=-2MO` (DTSTART 1997-09-22) | second-to-last Monday |
| `FREQ=MONTHLY;BYMONTHDAY=-3` | negative month day |
| `FREQ=YEARLY;COUNT=10;BYMONTH=6,7` (DTSTART 1997-06-10) | yearly with two months |
| `FREQ=MONTHLY;BYDAY=FR;BYMONTHDAY=13` | BYDAY filtering BYMONTHDAY (Friday the 13th) |

Plus Chrono-specific cases: monthly on the 31st skips short months; yearly Feb 29 only in leap years; `EXDATE` removes an
occurrence **after** COUNT is applied (RR4); `RDATE` adds occurrences that are not on the rule (and are not subject to
COUNT/UNTIL); Lord Howe 30-minute DST shift keeps wall time; plain (non-zoned) series.

**Overrides (RR6).** Matching is by **instant** (zoned) or wall time (plain): an override with `(recurringId = S, recurrenceId =
R)` removes the generated occurrence of series `S` whose start equals `R`, **even when the override itself is displayed
elsewhere or outside the visible range**; the override is a normal event for layout. An override whose `recurrenceId` matches an
excluded date or no occurrence is ignored with a development warning (once). Several overrides for one occurrence: the last one
in array order wins (warn).

**Identity (RR7).** Piece key = `${seriesId}:${occurrenceStartISO}` where the ISO is the *original* occurrence start (so an
override keeps its key when moved); `recurrence = { recurringId, occurrenceStart, isOverride, series }` is attached to the
segment (`series` is the app's series object, excluded from equality).

**Apply helpers (RR9) — exact behavior.** Inputs are the app's series object and the proposal's `recurrence` + new times; outputs
are **new objects** (never mutate):

| call | result |
| --- | --- |
| `applyRecurrenceChange(series, proposal, "this")` | `{ override }`: `{ …seriesAppFields, recurringId: series.id, recurrenceId: occurrenceStart, start, end }` (the app assigns the override's `id`); if the occurrence was already an override, the same shape replaces it |
| `…"following"` at occurrence index `i` (0-based) | old series: `until` = the instant 1 s before the occurrence start (UTC form for zoned series, previous date for date-only) and, when `count` was `N`, `count: i` instead of `until`; **if `i = 0` the old series disappears** (`series: undefined`, `removed: true`); `newSeries`: copy with `start`/`end` = the proposal times, `rrule` with `count: N − i` (or the original `until`), `exdates`/`rdates` limited to the new part |
| `…"all"` | `series` with `start`/`end` shifted by `Δ = to.start − from.start` (in wall time for plain, real time converted back to wall time of DTSTART's zone for zoned so the wall time follows the change), `exdates`/`rdates` shifted by the same Δ; returns `overrideIdMap: { fromRecurrenceId → toRecurrenceId }[]` so the app can update stored overrides |
| `applyRecurrenceDelete(series, occurrenceStart, "this")` | adds `exdates` (and returns `removedOverrideRecurrenceId` when the occurrence was an override) |
| `…"following"` | same as change-following without `newSeries` |
| `…"all"` | `{ removed: true }` |

Tests per row, with DST (New York, Lord Howe), COUNT split sums (`i + (N − i) = N`), `UNTIL` in zones, and a series whose first
occurrence is the edited one.

### 13.3 Test-support additions

- `fixtures/rfc-5545-examples.json` (hand-copied from the RFC) and `fixtures/rrule-parse.json` (valid/invalid strings → result or
  `{ code, part }`).
- `tests/support/oracle.ts`: independent day-by-day expander (loop over every day from dtstart to the window end, test the BY*
  conditions with `dayOfWeek`, `daysInMonth`, ordinal helpers) used by the seeded property tests.
- Seeded rule generator limited to the subset (freq, interval 1–4, count or until, 0–3 BY parts) producing rules the parser
  accepts.
- Adapter tests: dragging an occurrence yields a proposal with `recurrence`; the pending piece stays while the app's scope dialog
  promise is open; occurrence keys survive re-expansion (focus/selection stay on the same piece).

### 13.4 PR task list

| PR | Files | Done when |
| --- | --- | --- |
| 1 | `rrule.ts`, `expand.ts`, RFC golden table, DST tests | RFC table + subset property tests (vs oracle) green ×4 zones |
| 2 | `series.ts`, `pack.ts`, normalize hook (R1), cache, `onRecurrenceError` once-only (R5) | overrides/exdates/rdates tests; bundle test (R1); cache returns identical arrays |
| 3 | `apply.ts`, proposal `recurrence` field, `expandRecurrence` export | table rows of §13.2 tested incl. COUNT split and zones |
| 4–7 | React → Vue → Svelte → Vanilla (segment data, utilities module without directive, docs snippets, parity) | suites + parity; `directives.test.ts` still passes |
| 8 | Examples (Outlook recurring set + scope dialog, Next.js server expansion), docs, version `0.8.0`, size entries (R4) | full routine in 00 §5 |

### 13.5 Pitfalls checklist

- Never use `Date` arithmetic: month stepping with `addMonths` clamps (D5) — recurrence must **skip**, so compute candidate
  `(year, month, day)` triples and validate with `isValidDate` instead of calling `addMonths`.
- `UNTIL` before DTSTART yields only DTSTART when it counts (RFC) — test it; `COUNT` of 1 yields only DTSTART.
- The expansion cap (10,000) counts **iterations**, not produced occurrences, so a rule that matches nothing still stops.
- Sorting: occurrences must be strictly increasing by instant; de-duplicate `RDATE` that equals a generated occurrence.
- Keep rule parsing separate from expansion so apps can validate input in a server action without loading layout code.
