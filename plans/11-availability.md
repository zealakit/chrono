# Plan: stage 5c — Availability (`/calendar`, shared with `/date`, `/time`, `/datetime`)

Status: **proposal — not implemented**.

Order: **11 of N**. Third stage-5 plan (02 §9). Runs after `10-resources.md` (`0.6.0`).
Implements flow **F9**: one availability model that drives Calendar backgrounds
(`data-unavailable`, blocked periods, closed hours, per resource) **and** what the Date, Time
and DateTime components let users select. Next: `12-recurrence.md`.

Goal: an app describes availability once — opening hours, lunch breaks, holidays,
maintenance windows, a doctor's weekly schedule — and every Chrono view and picker shows and
respects it the same way. The app still decides whether something is *really* available
(BRD §11: "the hotel application remains responsible for determining whether rooms are
actually available").

**Scope rule:**
- The model lives in `foundation/` so every domain can use it without crossing domain
  boundaries (02 §2.6). Calendar adds rendering; Date, Time and DateTime only add an option.
- No new subpath. Calendar gets background pieces and one part; pickers get an
  `availability` option.
- No styling (02 §2.8). Signatures below are **shapes**.

---

## 1. Decisions taken in this plan

| # | Topic | Decision | Why |
| --- | --- | --- | --- |
| V1 | One spec | `AvailabilitySpec = { open?: Rule[]; blocked?: Rule[]; timeZone?: string }`. Without `open`, everything is open except `blocked`. With `open`, only times inside an `open` rule are available, minus `blocked`. **Blocked always wins** (decided, §11.1) | Covers "open hours" and "closed periods" with one rule that is easy to explain |
| V2 | Rule types | `{ type: "daily", start, end }` (every day, times only), `{ type: "weekly", days, start?, end? }` (weekdays, optional hours), `{ type: "dates", dates, start?, end? }` (specific days, optional hours), `{ type: "range", start, end }` (absolute period, dates or date-times). Every rule may carry `id`, `reason` and `data` (app fields, e.g. "Public holiday") | Expresses opening hours, lunch breaks, holidays and maintenance windows without a recurrence engine |
| V3 | Per resource | A rule may set `resourceId` (one id or a list); rules without it apply to all resources. Or the calendar option `getResourceAvailability(resource) → AvailabilitySpec` | Rooms and staff have their own hours (plan 10) |
| V4 | Compiled model | `createAvailability(spec)` (extends 03 §3.3) returns `{ getDayStatus(date, resourceId?) → "available" \| "partial" \| "unavailable"; isTimeAvailable(date, time, resourceId?); isRangeAvailable(start, end, resourceId?); getIntervals(start, end, resourceId?) → { start, end, status, rules }[]; nextAvailable(from, direction, resourceId?) }`. Per-day interval lists are computed lazily and cached for the visible range | One compiled object answers both "draw it" and "may I pick it" questions fast |
| V5 | Time zones and DST | Rules are wall times in `spec.timeZone` (default: the component's `timeZone`, else plain wall time). When the display zone differs, intervals are converted (a rule may move across midnight). DST days follow 03 D8 and 05 E9 | Venue hours stay correct for users in other zones |
| V6 | Time-only components | `TimeInput` / `TimePanel` have no date (07 scope). They use **only `daily` rules**; other rule types are ignored with a development warning | Keeps Time date-free; opening-hours pickers still work |
| V7 | Date status in pickers | `DatePanel` (and the date part of DateTime): fully unavailable days are `unavailable` (03 D14: focusable, not selectable). **Partial** days stay selectable and get `data-partially-available` (decided, §11.3). Range checks (`allowUnavailableInside`) use fully unavailable days only | A day with a closed lunch hour is still a valid booking day |
| V8 | Times in pickers | `TimePanel` options and slots in DateTime (and Time with `daily` rules) are unavailable when `isTimeAvailable` is false (for slots: when any part of the slot is unavailable) | Slot lists hide nothing but block what cannot be booked |
| V9 | Calendar backgrounds | With the `availability` option, Calendar layouts produce **background pieces** for unavailable intervals (option `backgrounds: "unavailable" \| "available" \| "both" \| false`, default `"unavailable"`): per day column in time grids, per resource column/row (plan 10), per day cell in month views (only when partial: full days use cell attributes). Pieces use the same position properties as events (05 E10) | Shading closed hours, lunch breaks, holidays, maintenance |
| V10 | Interaction | `availabilityBlocksInteraction` (default `true`): range selection (05 E14) and moves/resizes (09) that cover unavailable time are invalid previews (`data-invalid`) and cannot be confirmed. `validateSelection` / `validateEventChange` still run afterwards (decided, §11.2) | What looks closed is not bookable by drag; apps can turn it off for "warn only" UIs |
| V11 | Events as availability | Helper `availabilityFromEvents(events, { resourceId? }) → Rule[]` (in `/calendar`) turns existing bookings into `blocked` `range` rules | The common "already booked" case without app glue |
| V12 | Labels | Cells, slots and options add the status to their `aria-label` ("unavailable", "partially available") plus the rule reason via `getAvailabilityLabel(rules) → string` (default: the first rule's `reason`). Background pieces are `aria-hidden` | Screen-reader users hear why a time is blocked |
| V13 | Lead time and booking window | Spec fields `leadTime` (`{ minutes?; hours?; days?; businessDays? }`): nothing before now + lead time is available ("deliveries need 2 business days", "appointments at least 4 h ahead"). `cutoffTime` (e.g. `"14:00"`): after it, "today" no longer counts for day-based lead times. `bookingWindow` (`{ days?; months? }`): nothing after now + window is available. Evaluated in the spec's zone with injectable `now`; applied everywhere V4 is | E-commerce delivery dates, medical and service booking (BRD §4.2) |
| V14 | Business-day helpers | `isBusinessDay(date, availability)`, `addBusinessDays(date, n, availability)`, `countBusinessDays(range, availability)`. A business day is a day that is not fully unavailable in the spec (weekends and holidays come from the rules) | SLAs, delivery promises and deadlines without a separate holiday library |

---

## 2. Core

### 2.1 Files

```text
packages/core/src/foundation/constraints/
├── availability.ts          # extended: V1–V5 rules, compile, cache, queries
└── availability-rules.ts    # rule normalization and per-day expansion
packages/core/src/calendar/
├── events/background-layout.ts   # V9: pieces for time grid, month, resource views, timeline
└── availability.ts               # V11 availabilityFromEvents; V10 checks used by interaction
packages/core/src/date/   ·  time/  ·  datetime/   # option wiring only (V6–V8)
```

03's date-only `createAvailability({ dates, ranges, weekdays, mode })` is replaced by the V1
spec. The old shape is accepted for one minor version with a development warning, then
removed before 1.0 (pre-1.0 rules, 04 C15).

### 2.2 Options

| Component | Option |
| --- | --- |
| Calendar | `availability?: AvailabilitySpec \| Availability` (spec or compiled), `getResourceAvailability?`, `backgrounds?`, `availabilityBlocksInteraction?`, `getAvailabilityLabel?` |
| DatePanel, DateRangePanel, MultiDatePanel, DateInput, DateRangeInput | `availability?` (date status, V7) |
| TimePanel, TimeRangePanel, TimeInput, TimeRangeInput | `availability?` (`daily` rules only, V6) |
| DateTime components | `availability?` (dates and times, V7–V8) |

Existing predicates (`isDateUnavailable`, `isTimeUnavailable`) keep working and are combined
with `availability` (unavailable if either says so).

### 2.3 Attributes and parts

| Element | Additions |
| --- | --- |
| Month cell / panel day cell | `data-unavailable` (fully), `data-partially-available`, label suffix (V12) |
| Time slot / time option / timeline cell | `data-unavailable`, label suffix |
| Background piece | `aria-hidden="true"`, `data-chrono-background`, `data-status` (`unavailable` / `available`), `data-rule-id`, `data-resource-id`, position properties |

New Calendar part (React, Vue, Svelte): `CalendarBackground` (`div`, one per background piece;
children/slot receive the piece with its `rules`, so the app can print "Lunch" or "Holiday").
Vanilla: templates stamp the background attributes.

New default messages (English only): `partiallyAvailable`.

---

## 3. Tests

Core (four `TZ` zones):

| File | Proves |
| --- | --- |
| `foundation/availability.test.ts` | Every rule type; open + blocked precedence (V1); resources (V3); statuses; `nextAvailable`; old-shape compatibility warning |
| `foundation/availability-lead-time.test.ts` | `leadTime` incl. business days, `cutoffTime` before/after, `bookingWindow`, near midnight in several zones; business-day helpers vs a naive loop |
| `foundation/availability-zones.test.ts` | Spec zone ≠ display zone, rules crossing midnight after conversion, DST days in New York and Lord Howe |
| `foundation/availability-bruteforce.test.ts` | Seeded random specs: `getIntervals` and `isTimeAvailable` agree with a naive minute-by-minute scan over a week |
| `calendar/background-layout.test.ts` | Pieces for time grid, month partial days, resource time grid, timeline (golden fixtures); `backgrounds` modes |
| `calendar/availability-interaction.test.ts` | Selection and drag invalid over unavailable time; option off; validate hooks still run |
| `date|time|datetime/*availability*.test.ts` | Picker statuses: partial vs unavailable days, range checks, time options and slots, daily-only rule for Time |
| `bench.test.ts` (extend) | 200 resources × 1 week with weekly hours + 50 blocked ranges: background layout < 20 ms. Report only |

Adapters: `calendar-backgrounds` (custom content via `rules`), availability in each picker,
parity, no-styles, SSR.

Manual a11y: labels with reasons in the month view, time grid slots and a slot list.

---

## 4. Size budgets

| Entry | Old ceiling | New ceiling (gzip) |
| --- | --- | --- |
| `core/foundation` | 12 KB (plan 07) | 13 KB |
| `core/calendar` (without / with `resourceViews`) | 19 / 26 KB | 21 / 28 KB |
| `<adapter>/calendar` (without / with pack) | 40 / 50 KB | 42 / 52 KB |
| `<adapter>/date`, `/time`, `/datetime` | 28 / 22 / 48 KB | +1 KB each |

---

## 5. Examples

- **Clinic booking** (DateTime): a doctor's weekly hours, lunch break, public holidays;
  `DateTimePanel` with slots showing blocked times; the same spec shades the clinic's week view.
- **Outlook shell**: closed hours and a company holiday as backgrounds; drag over closed time is
  refused.
- **Room timeline** (plan 10): maintenance windows per room, bookings turned into blocked rules
  with `availabilityFromEvents`.
- **Opening hours** (plan 07): `TimePanel` with `daily` rules for a lunch break.

---

## 6. Docs and agent files

- Adapter READMEs (EN/VI/CN): one "Availability" section shared by all domains — the spec,
  rule types, precedence, zones, how each component uses it (table from §2.2), backgrounds,
  interaction blocking, and the reminder that real availability is decided by the app.
- `skills/chrono-*.md`: "show and enforce availability" steps.
- `.agents/AGENTS.md` + skill: availability lives only in `foundation/constraints` (one
  model, no per-domain copies).

---

## 7. Delivery (PR breakdown)

| PR | Content |
| --- | --- |
| 1 | Foundation availability (rules, compile, zones, queries) + brute-force tests |
| 2 | Calendar background layout, interaction checks, `availabilityFromEvents` |
| 3 | Picker wiring (date, time, datetime core) |
| 4 | React (calendar part + picker options) |
| 5 | Vue |
| 6 | Svelte |
| 7 | Vanilla + parity |
| 8 | Examples, docs, size budgets. Version `0.7.0` |
| Release | Manual `0.7.0` on `latest` (04 §9 Release) |

PRs 5–7 can run in parallel after PR 4.

---

## 8. Definition of done

- All checks pass; examples build.
- F9 acceptance: the same spec gives matching results in Calendar backgrounds and in every
  picker (a shared fixture checks this across domains and adapters).
- Brute-force agreement on 1,000 seeded specs per run.
- Manual screen-reader check recorded.

---

## 9. Changes to earlier plans

- **03 §3.3:** `createAvailability` takes the V1 spec; the date-only shape is deprecated
  (removed before 1.0).
- **05 / 09:** selection and drag check availability first when V10 is on.
- **06 / 07 / 08:** every picker gains the `availability` option (§2.2).
- **02 §4:** vocabulary gains `data-partially-available`, `data-chrono-background`,
  `data-status`, `data-rule-id`.

---

## 10. Out of scope

- Recurring rules beyond daily/weekly/dates/ranges (e.g. "every second Tuesday") — plan 12's
  RRULE subset could feed availability later.
- Capacity (e.g. "3 of 5 seats left") — app data; apps can put it in `rule.data` and render it.
- Fetching or validating availability on a server.

---

## 11. Open questions

1. ~~**Precedence**~~ — **decided: blocked always wins** over `open` (V1).
2. ~~**Interaction blocking**~~ — **decided: block by default** (`availabilityBlocksInteraction:
   true`); apps can turn it off for warn-only UIs (V10).
3. ~~**Partial days in date pickers**~~ — **decided: keep pickable**, marked
   `data-partially-available` (V7).

All open questions are decided.

---

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
