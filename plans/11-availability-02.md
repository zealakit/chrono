# Plan: stage 5c — Availability (`/calendar`, shared with `/date`, `/time`, `/datetime`) — part 2 of 2

> Part 2 of 2 of [`11-availability.md`](11-availability.md) (the index: scope, status and the part table). Section numbers (`§N`) are unchanged by the split. Shared rules: [`00-conventions-as-built.md`](00-conventions-as-built.md).

## 12. Implementation guide (added after stages 1–2 shipped)

Read [`00-conventions-as-built.md`](00-conventions-as-built.md) and the guides of plans 05, 09 and 10 first. Decisions
V1–V14 stay unless a bullet below says otherwise.

### 12.1 Reconciliations with the as-built code

| # | Problem | Resolution |
| --- | --- | --- |
| R1 | **The old `createAvailability` exists and is used.** `foundation/constraints/availability.ts` exports `createAvailability(spec)` with the legacy `AvailabilitySpec = { dates?, ranges?, weekdays?, mode }` returning `{ isAvailable(date), nextAvailable(date, direction) }`; `checkDateRange` takes `availability?: Availability`; `constraints.test.ts` exercises it (including a brute-force test). The V1 spec reuses the names `AvailabilitySpec` and `Availability`. | Rename the legacy types to `LegacyAvailabilitySpec` / keep `Availability` as the **compiled** type but extend it (V4). `createAvailability(input)` discriminates at runtime: `"mode" in input` → legacy path (compiled into the same new engine via a converter: `mode: "available"` → `open` rules, `"blocked"` → `blocked` rules; `dates` → `dates` rule, `ranges` → `range` rules with **inclusive** end converted to the new half-open end, `weekdays` → `weekly`), with a once-per-process development warning. Keep `isAvailable(date)` on the compiled object as `getDateStatus(date) !== "unavailable"` and keep `nextAvailable(date, direction)` (strictly after/before, `null` at the bounds) so `checkDateRange` and the existing tests pass unchanged. Remove the legacy path in the release before 1.0 (plan 13 lists it). |
| R2 | **Foundation budget ceilings were estimates.** `core/foundation` is a worst-case measurement (the whole entry, nothing tree-shaken): plans 05–08 already raised it and this plan's availability engine adds more. The **binding** constraints for apps are the `<adapter>/<entry>` budgets (tree-shaken real bundles). | Rule change (this is the plan change 04 §6 requires): the `core/foundation` budget becomes a *tracking* number = measured +15 %, rounded up to 0.5 KB, re-set in each PR; it may exceed the older tables as long as every `<adapter>/*` entry stays within its ceiling. Document the measured numbers in the PR. If an adapter entry would exceed its ceiling, split code (e.g. keep lead-time/business-day helpers in their own file so unused ones tree-shake) before asking to raise it. |
| R3 | **Day status vocabulary.** `getDateStatus` already exists as a *foundation function* (`getDateStatus(date, constraints)` returning `{ selectable, disabled, unavailable, reason }`); V4 adds a *method* with the same name on the compiled object. | Keep both but name the method **`getDayStatus(date, resourceId?)`** (`"available" \| "partial" \| "unavailable"`) to avoid confusion in docs and imports. Update §1 V4, §2 and the tests accordingly. The foundation function `getDateStatus` consumes it (an availability-unavailable day maps to `unavailable: true, reason: "unavailable"`). |
| R4 | **`partial` would flag nearly every day** when the spec has `open` hours (an open Mon–Fri 09–17 spec leaves 16 closed hours every weekday). | Define day status **relative to the day's potential time**: potential = the `open` intervals of that day (or the whole day when no `open` rules). `unavailable` = no available instant on the day; `partial` = some potential time is blocked (lunch break, a booking, lead time already passed today); `available` = all potential time is available. So weekdays with only open hours are `available`; with a blocked lunch they are `partial` — apps that do not care simply ignore `data-partially-available`. Test with these three specs. |
| R5 | **Month views have no time axis.** V9 says pieces "per day cell in month views (only when partial)". | Decision: **month cells get attributes only** (`data-unavailable`, `data-partially-available`, label suffix); background *pieces* exist only in time grids, resource time grids and timelines. |
| R6 | **`isRangeAvailable` vs the dragged event itself.** With `availabilityFromEvents(events)` a moving event would block its own new position. | `availabilityFromEvents(events, { resourceId?, excludeId? })`, and the Calendar `availability` option additionally accepts a **function** `(ctx: { excludeEventId?: id }) => AvailabilitySpec \| Availability`, called with the dragged/resized event's id during interaction checks (V10) and without it for rendering. The compiled result is cached per call identity inside the controller for the duration of one drag. Document the recipe (`availability={(ctx) => compile(fromEvents(events, ctx))}`) and test that a drop onto the event's own old slot is valid. |
| R7 | **Compile cost with inline specs.** Apps may pass `availability={{ open: [...] }}` literals, recompiled each render. | Compile once per **identity** (`WeakMap<spec, compiled>`); a compiled `Availability` passes through untouched. State equality must not JSON the spec (rules carry app `data`): the controller stores the compiled object and compares by reference. README + skill: memoize specs (`useMemo`/`computed`/module constants). Add a development warning when more than ~50 distinct specs are compiled in one second. |
| R8 | **Date-only `range` rules and end semantics.** V2 allows dates or date-times. | A `range` with **dates** is half-open `[start, end)` (end exclusive), the same as all-day events (05 E3) and `availabilityFromEvents`; a range with date-times is half-open over instants/wall times. Add `fromInclusiveEndDate` to the doc. Legacy ranges (R1) are converted from inclusive. |

### 12.2 Engine design (`foundation/constraints/availability*.ts`)

**Canonical representation:** a sorted, merged list of **instant intervals** `[startMs, endMs)`. Rules are
expanded **lazily per visible window** (the controller asks for `[rangeStart, rangeEnd)`; pickers ask per month/day)
and the expansion for a window is cached on the compiled object (bounded cache: at most ~400 day buckets, oldest
evicted). Algorithm for a window:

1. For every rule that applies (resource filter, V3) produce intervals in the **spec zone**:
   - `daily` `start–end`: for each day in the window → `[day@start, day@end)`; `end ≤ start` means "ends the
     next day" (`22:00–02:00`); `end === start` is invalid (dev error); the end token `"24:00"` is allowed.
   - `weekly` `days` (+ optional hours; default whole day) and `dates` (+ optional hours): same, filtered by weekday
     or by date.
   - `range`: the given absolute period (dates → whole days, half-open).
2. Convert each wall interval to instants with `toZoned(.., specZone, "compatible")` (DST rules 03 D8 / 05 E9: a rule
   starting inside a gap starts at the gap end; ending inside a gap ends at the gap end; the repeated hour is
   covered fully).
3. `open` = union of open intervals (or the whole window when no `open` rules); `blocked` = union of blocked
   intervals; `available = open − blocked` (**blocked wins**, V1); apply `leadTime`/`bookingWindow` as two more
   blocked intervals (`(-∞, notBefore)` and `[notAfter, ∞)`) computed from the injectable `now` in the spec zone.
4. Queries (`getIntervals`, `isTimeAvailable`, `isRangeAvailable`, `getDayStatus`, `nextAvailable`) are binary
   searches over the cached list; times are converted from the **display zone** to instants first (V5), so a rule in
   `Asia/Ho_Chi_Minh` is correct for a user in `America/New_York` and can cross that user's midnight.

`getIntervals(start, end, resourceId?)` returns contiguous, sorted pieces covering exactly `[start, end)`, each
`{ start, end, status: "available" | "unavailable", rules }`, where `rules` are the blocked rules overlapping the piece
(empty when it is unavailable only because no `open` rule covers it).

**Worked fixtures (hand-written, `tests/fixtures/availability/*.json`):**

| spec (zone `Asia/Ho_Chi_Minh`) | query | expected |
| --- | --- | --- |
| `open: weekly Mon–Fri 09:00–17:00`, `blocked: daily 12:00–13:00` | Mon 2026-11-16 | intervals: 00–09 unavailable, 09–12 available, 12–13 unavailable (rule = lunch), 13–17 available, 17–24 unavailable; day status `partial` |
| same | Sat 2026-11-21 | one unavailable interval; day status `unavailable` |
| `open: weekly Mon–Fri 09–17` (no blocked) | Mon | day status `available` (R4) |
| `blocked: dates [2026-11-20]` only | Fri 11-20 / Sat 11-21 | Fri `unavailable`, Sat `available` |
| `open: daily 22:00–02:00` | Tue 22:00 → Wed 02:00 | available across midnight; Wed 02:00–02:01 unavailable |
| same spec viewed in `America/New_York` (Nov 17 07:00 Ho Chi Minh = Nov 16 19:00 New York) | New York Nov 16 | pieces shifted by the zone offset, interval crossing New York midnight split per day |
| `blocked: range 2026-03-08 02:00–03:30` zone New_York | Mar 8 | blocked starts at the gap end (03:00) |

**Lead time / cutoff / booking window (V13) — exact rules** (evaluated in the spec zone, `now` injectable):

- `leadTime: { minutes | hours }` → `notBefore = now + duration` (real time). `{ days }` → calendar days: `notBefore =
  startOfDay(today + days)`. `{ businessDays: N }` → **order-day** rule: `orderDay` = today if today is a business day and
  `now.time < cutoffTime` (or no cutoff), otherwise the next business day; `notBefore = startOfDay(orderDay + N business
  days)`. Business days come from the spec **without** lead time and booking window (no circularity).
- Example (weekends closed): Fri 2026-11-20 13:00, `businessDays: 2`, `cutoffTime: "14:00"` → orderDay Fri → Mon(1),
  Tue(2) → first available day **Tue 11-24**. Same at 15:00 → orderDay Mon 11-23 → **Wed 11-25**. On Sat any time →
  orderDay Mon → Wed 25.
- `bookingWindow: { days | months }` → last available day = `today + days` (inclusive) or `addMonths(today, months)`
  (constrained day, 03 D5); everything after the end of that day is unavailable.

**Business-day helpers (V14)** use `getDayStatus(date) !== "unavailable"` of the lead-time-free spec. `addBusinessDays(d, n)` for
negative `n` walks backwards; `n = 0` returns `d` when it is a business day, else the next one; `countBusinessDays(range)` is
inclusive of both ends (document it; matches picker ranges). Cap the walk at 4,000 days and return `null`/throw a
`RangeError` with a clear message when no business day exists (e.g. everything blocked).

### 12.3 Calendar and picker wiring

- **Backgrounds (V9).** `events/background-layout.ts` returns pieces `{ key, dayKey, resourceKey?, top, height | left,
  width, status, rules }` per day column (time grid), per resource column (plan 10) and per timeline row, using the
  same fraction convention as events (05 E10) and wall-time positions on DST days. `backgrounds: "available"` renders the
  complement. Pieces are `aria-hidden`; labels live on cells/slots (V12).
- **Interaction (V10).** The selection and drag machines call `availability.isRangeAvailable(start, end, resourceId)`
  **before** `validateSelection`/`validateEventChange`; an unavailable preview gets `data-invalid` and cannot be dropped.
  `availabilityBlocksInteraction: false` skips the check (warn-only UIs).
- **Pickers.** The options `availability` is combined with `isDateUnavailable`/`isTimeUnavailable` (**or**). `TimePanel`
  receives only `daily` rules (V6): non-daily rules are filtered at compile time for time-only components with a one-time
  development warning. Slots (07 R2 `BookingSlot`) are unavailable when **any part** overlaps unavailable time (V8).
- **Labels (V12).** `getAvailabilityLabel(rules)` default = `rules[0]?.reason`; cells/slots/options append
  `, <word>` (messages `unavailable`, `partiallyAvailable`) and `, <reason>` when present.

### 12.4 Test-support additions

- `tests/support/oracle.ts` (core): minute-by-minute scan of a week for the brute-force test, independent of the engine
  (uses `toZoned`/`fromInstant` only). 1,000 seeded specs per run (rules count 0–6, resources 0–3, zones from the four
  matrix zones + `Asia/Ho_Chi_Minh`).
- A cross-domain fixture `tests/fixtures/availability/shared.json` (spec + expected statuses) read by core tests of
  calendar backgrounds, `date`, `time` (daily only) and `datetime`, and by each adapter's parity test, so "the same spec
  gives matching results everywhere" (F9) is one data file, not four copies.
- Legacy compatibility tests keep the existing `constraints.test.ts` availability cases running through the converter.

### 12.5 PR task list

| PR | Files | Done when |
| --- | --- | --- |
| 1 | `foundation/constraints/availability.ts` (+ `availability-rules.ts`), legacy converter (R1), brute-force/zones/lead-time tests, budgets re-set (R2) | all fixtures green ×4 zones; legacy tests unchanged; `check:size` green |
| 2 | `calendar/events/background-layout.ts`, `calendar/availability.ts` (`availabilityFromEvents`, function option R6), interaction checks | golden background fixtures; interaction tests incl. own-slot drop |
| 3 | Option wiring in `date`, `time`, `datetime` cores (V6–V8), labels/messages | picker status tests; daily-only filter + warning |
| 4–7 | React → Vue → Svelte → Vanilla (`CalendarBackground`, options plumbing, parity) | suites + parity green |
| 8 | Examples (clinic, Outlook shell closed hours, room timeline, opening hours), docs, version `0.7.0` | full routine in 00 §5 |

### 12.6 Pitfalls checklist

- Never use `Date` arithmetic for day expansion; use foundation zoned functions (`toZoned`, `fromInstant`, `addDays`).
- Cache keys must include the window and `now`; changing `now` (tests) must not return stale intervals.
- `rule.data`/`reason` are app values — never serialize them into state comparison or attribute records; only the
  derived `data-rule-id` (string) goes into the DOM.
- Do not hide unavailable slots/options: they stay focusable with `aria-disabled` (03 D14).
- The compiled object is immutable; `setOptions` with the same compiled object must not notify.
