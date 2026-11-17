# Plan: stage 5d — Recurring events (`/calendar`)

Status: **proposal — not implemented**.

Order: **12 of N**. Last stage-5 plan (02 §9). Runs after `11-availability.md` (`0.7.0`).
Implements flow **F10**: expand a recurrence rule into the occurrences of the visible range,
and give edits of a recurring occurrence the information the app needs to apply them to
"this", "following" or "all" occurrences. Next: `13-ecosystem.md` (stage 6).

Goal: apps can pass a series (one event + a rule) instead of pre-expanded occurrences, and
editing an occurrence works with the drag/resize flow from plan 09. Chrono expands and
proposes; the app stores series, overrides and exceptions (BRD §11).

**Scope rule:**
- Calendar domain only, same `/calendar` entry, as an **opt-in pack** (same pattern as
  `resourceViews`, 10 R4).
- Pre-expanded occurrences (05 E21) keep working unchanged.
- A subset of RFC 5545 RRULE (02 F10). No recurrence-editor UI, no natural-language
  descriptions (§10).
- Signatures below are **shapes**.

---

## 1. Decisions taken in this plan

| # | Topic | Decision | Why |
| --- | --- | --- | --- |
| RR1 | Series input | An event may carry `rrule` (RFC 5545 `RRULE` value string, e.g. `"FREQ=WEEKLY;BYDAY=MO,WE"`, or the parsed object), `exdates` and `rdates`. The event's `start`/`end` are the first occurrence (DTSTART) and its duration | Matches iCal/Google data, so apps pass stored series as they are |
| RR2 | Opt-in pack | `import { recurrence } from ".../calendar"` and pass `recurrence={recurrence}`. Without the pack, an event with `rrule` shows only its first occurrence and warns once in development (decided, §12.1) | The RRULE engine is sizeable; calendars that receive pre-expanded data do not pay for it |
| RR3 | Supported subset | `FREQ` = `DAILY` / `WEEKLY` / `MONTHLY` / `YEARLY`; `INTERVAL`; `COUNT`; `UNTIL`; `BYDAY` (with ordinals for monthly/yearly, e.g. `2TU`, `-1FR`); `BYMONTHDAY` (incl. negative); `BYMONTH`; `WKST`; plus `EXDATE` and `RDATE` through `exdates` / `rdates`. Anything else (`BYSETPOS`, `BYWEEKNO`, `BYYEARDAY`, `BYHOUR`, `HOURLY` …) is rejected: the event shows its first occurrence only and `onRecurrenceError(event, error)` fires (decided, §12.2) | The F10 subset plus the two parts needed for common yearly and weekly rules. Failing loudly beats expanding wrongly |
| RR4 | Semantics | RFC 5545: occurrences keep the **wall time** of DTSTART in the event's zone (or as plain wall time), so DST does not shift a 09:00 meeting. Invalid dates are skipped (monthly on the 31st skips short months; yearly Feb 29 only in leap years). `UNTIL` is inclusive. `COUNT` counts generated occurrences before `EXDATE` removal | Interoperable with other calendar software |
| RR5 | Range-limited expansion | Only occurrences that overlap `visibleRange` (looking back by the event's duration) are produced. Rules without `COUNT` jump straight to the range; rules with `COUNT` iterate from DTSTART with a 10,000-step cap (dev warning when hit). Expansions are cached per series (rule + DTSTART + exdates) and range | A ten-year daily series costs the same as one week of it |
| RR6 | Overrides | An event with `recurringId` (the series id) and `recurrenceId` (the original occurrence start) **replaces** that occurrence (RFC `RECURRENCE-ID`). It can move, change duration or carry different app fields | "This occurrence" edits must show correctly after the app saves them |
| RR7 | Occurrence identity | Each occurrence piece carries `event` (the series, or the override), `recurrence: { recurringId, occurrenceStart, isOverride }` and a stable key `${seriesId}:${occurrenceStart ISO}`. `data-recurring` stays (05 E21) | Selection, focus and pending state (09 M3) survive re-expansion |
| RR8 | Edit proposals | When an occurrence is moved or resized (09), the proposal gains `recurrence` (RR7 data). **Chrono never chooses the scope.** The app asks the user (its own dialog) and applies it; `onEventChange` can return a `Promise` while the dialog is open, so the pending piece stays (09 M3) | The scope question is UX the app owns; Chrono provides the data |
| RR9 | Apply helpers | Pure helpers return new data for the app to save: `applyRecurrenceChange(series, proposal, scope)` → `{ series?, override?, newSeries? }` for `"this"` (override), `"following"` (end the old series with `UNTIL` before the occurrence, start a new series from it; `COUNT` is split correctly) and `"all"` (shift the series DTSTART and keep the rule). `applyRecurrenceDelete(series, occurrenceStart, scope)` → `{ series?, removed? }` (`"this"` adds an `EXDATE`, `"following"` sets `UNTIL`, `"all"` removes the series) (decided, §12.3) | These are easy to get wrong (DST, COUNT, UNTIL in zones); shared helpers keep apps correct |
| RR10 | Parse and stringify | `parseRRule(string) → RRule` and `stringifyRRule(rule) → string` (subset only, RR3), exported for apps that edit rules in their own UI | Apps build their own recurrence editors |

---

## 2. Core

### 2.1 Files

```text
packages/core/src/calendar/recurrence/
├── rrule.ts            # RR3 parse / stringify / validate
├── expand.ts           # RR4–RR5 iteration per FREQ, BY* filters, ordinals, skip invalid dates
├── series.ts           # RR1 series normalization, exdates/rdates, overrides (RR6), cache
├── apply.ts            # RR9 helpers
└── pack.ts             # `recurrence` pack: plugs expansion into events/normalize (RR2)
```

`events/normalize.ts` (05) gets one hook: if a recurrence pack is registered, series are
expanded for `visibleRange` before layout. Without the pack the hook is a no-op (no import of
`recurrence/`). Same registry approach as the resource layouts (10 §2.1).

### 2.2 Options and exports

Calendar options: `recurrence?: RecurrencePack`, `onRecurrenceError?: (event, error) => void`.
Event input gains `rrule?`, `exdates?`, `rdates?`, `recurrenceId?`.

`/calendar` exports: `recurrence` (pack), `parseRRule`, `stringifyRRule`,
`expandRecurrence(series, range)` (depth-1 utility, works without a calendar),
`applyRecurrenceChange`, `applyRecurrenceDelete`, types. All are plain data/functions (no
`"use client"`, 04 C13), so they also run on the server — e.g. to expand series for an
agenda email or to validate in a server action.

### 2.3 Attributes

| Element | Additions |
| --- | --- |
| Event (occurrence) | `data-recurring` (existing), `data-override` on overridden occurrences, `aria-label` suffix from messages `recurring` ("recurring event") |

New default messages (English only): `recurring`.

---

## 3. Adapters

No new parts. Hooks expose the `recurrence` data on segments so render callbacks can show a
repeat icon. The keyboard and drag flows are unchanged (plans 05, 09). Vanilla templates read
the same segment data.

---

## 4. Tests

Core (four `TZ` zones):

| File | Proves |
| --- | --- |
| `recurrence/rrule.test.ts` | Parse/stringify round trip for the subset; every unsupported part rejected with a clear error |
| `recurrence/rfc-examples.test.ts` | The RFC 5545 §3.8.5.3 examples that fall inside the subset, as a golden table (expected occurrence lists copied from the spec) |
| `recurrence/expand.test.ts` | Each FREQ × INTERVAL; ordinals (`2TU`, `-1FR`); negative `BYMONTHDAY`; Feb 29 yearly; monthly 31st; `WKST` effect on weekly `INTERVAL=2`; `COUNT` with `EXDATE`; inclusive `UNTIL` in zoned and plain form; `RDATE` |
| `recurrence/dst.test.ts` | Weekly 09:00 series across New York and Lord Howe DST changes keeps 09:00; occurrences in a DST gap follow 03 D8 `"compatible"` |
| `recurrence/range.test.ts` | Range-limited expansion equals full expansion clipped to the range (seeded random rules); the 10,000-step cap |
| `recurrence/overrides.test.ts` | Overrides replace their occurrence, moved overrides outside the original day, override of an excluded date ignored with a warning |
| `recurrence/apply.test.ts` | `this` / `following` / `all` for change and delete, incl. COUNT split, UNTIL in zones, series starting on the edited occurrence |
| `bench.test.ts` (extend) | 500 weekly series in a month view < 10 ms (cached), first expansion reported. Report only |

Adapters: occurrence rendering with `recurrence` data, dragging an occurrence produces a
proposal with `recurrence`, pending while an async scope dialog is open, parity, no-styles,
and a bundle test proving the base `Calendar` without the pack reaches no `recurrence/` files.

---

## 5. Size budgets

| Entry | Ceiling (gzip) |
| --- | --- |
| `core/calendar` without packs | unchanged: 21 KB (plan 11) |
| `core/calendar` + `recurrence` | +6 KB on top of the configuration it is added to |
| `<adapter>/calendar` + `recurrence` | +6 KB on top of the configuration it is added to |

`check-size.mjs` gains "with recurrence" and "with both packs" entries.

---

## 6. Examples

- **Outlook shell**: a weekly stand-up (`FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR`), a monthly review
  (`BYDAY=-1FR`), a yearly birthday, an exception (`exdates`) and an override (moved occurrence).
  Dragging an occurrence opens the example's own "this / following / all" `<dialog>`; the
  example applies the choice with `applyRecurrenceChange` and updates its state.
- **Server use** (Next.js): a Server Component lists next week's occurrences with
  `expandRecurrence` (shows the utilities work on the server, 04 C13).

---

## 7. Docs and agent files

- Adapter READMEs (EN/VI/CN): recurrence section — enabling the pack, series input, the
  supported subset table (and what is rejected), DST behavior, overrides, the scope flow with
  apply helpers, server-side expansion.
- `skills/chrono-*.md`: "recurring events" steps, including the scope dialog recipe.
- `.agents/AGENTS.md` + skill: the RR3 subset as a hard boundary (adding a rule part needs a
  plan change and RFC examples in tests).

---

## 8. Delivery (PR breakdown)

| PR | Content |
| --- | --- |
| 1 | `rrule.ts` + `expand.ts` + RFC golden table + DST tests |
| 2 | `series.ts` (exdates, rdates, overrides, cache), range-limited expansion, `pack.ts`, normalize hook |
| 3 | `apply.ts` helpers + tests; proposal `recurrence` field (09) |
| 4 | React (segment data, docs snippets) |
| 5 | Vue |
| 6 | Svelte |
| 7 | Vanilla + parity |
| 8 | Examples, docs, size budgets. Version `0.8.0` |
| Release | Manual `0.8.0` on `latest` (04 §9 Release) |

PRs 5–7 can run in parallel after PR 4.

---

## 9. Definition of done

- All checks pass; examples build (incl. the Next.js server-side expansion page).
- F10 acceptance covered by core and adapter tests; RFC golden table passes; range-limited
  expansion matches full expansion on 1,000 seeded rules per run.
- The base `Calendar` without the pack contains no recurrence code.
- Parity identical across adapters.

---

## 10. Out of scope

- A recurrence editor component and natural-language rule descriptions ("every 2 weeks on
  Monday") — apps build them with `parseRRule` / `stringifyRRule`; candidates after 1.0.
- RRULE parts outside the RR3 subset (§12.2) and `HOURLY`/`MINUTELY`/`SECONDLY` frequencies.
- Recurring availability rules (11 §10) — possible later on top of this engine.
- iCalendar file import/export (`.ics`) — app or a separate library.

---

## 11. Changes to earlier plans

- **05:** `events/normalize.ts` gains the recurrence hook; event input gains `rrule`,
  `exdates`, `rdates`, `recurrenceId`.
- **09:** `EventChangeProposal` gains `recurrence` (RR8).
- **02 §4:** vocabulary gains `data-override`.

---

## 12. Open questions

1. ~~**Opt-in pack**~~ — **decided: opt-in.** Recurrence works only when the app passes
   `recurrence` (RR2).
2. ~~**`BYSETPOS`**~~ — **decided: leave it out** of v1. Rules using it are rejected with
   `onRecurrenceError` (RR3); candidate after 1.0.
3. ~~**Apply helpers**~~ — **decided: ship them.** `applyRecurrenceChange` and
   `applyRecurrenceDelete` return new data; the app still asks the user and saves (RR9).

All open questions are decided.

---

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
