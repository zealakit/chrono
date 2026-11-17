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
| V4 | Compiled model | `createAvailability(spec)` (extends 03 §3.3) returns `{ getDateStatus(date, resourceId?) → "available" \| "partial" \| "unavailable"; isTimeAvailable(date, time, resourceId?); isRangeAvailable(start, end, resourceId?); getIntervals(start, end, resourceId?) → { start, end, status, rules }[]; nextAvailable(from, direction, resourceId?) }`. Per-day interval lists are computed lazily and cached for the visible range | One compiled object answers both "draw it" and "may I pick it" questions fast |
| V5 | Time zones and DST | Rules are wall times in `spec.timeZone` (default: the component's `timeZone`, else plain wall time). When the display zone differs, intervals are converted (a rule may move across midnight). DST days follow 03 D8 and 05 E9 | Venue hours stay correct for users in other zones |
| V6 | Time-only components | `TimeInput` / `TimePanel` have no date (07 scope). They use **only `daily` rules**; other rule types are ignored with a development warning | Keeps Time date-free; opening-hours pickers still work |
| V7 | Date status in pickers | `DatePanel` (and the date part of DateTime): fully unavailable days are `unavailable` (03 D14: focusable, not selectable). **Partial** days stay selectable and get `data-partially-available` (decided, §11.3). Range checks (`allowUnavailableInside`) use fully unavailable days only | A day with a closed lunch hour is still a valid booking day |
| V8 | Times in pickers | `TimePanel` options and slots in DateTime (and Time with `daily` rules) are unavailable when `isTimeAvailable` is false (for slots: when any part of the slot is unavailable) | Slot lists hide nothing but block what cannot be booked |
| V9 | Calendar backgrounds | With the `availability` option, Calendar layouts produce **background pieces** for unavailable intervals (option `backgrounds: "unavailable" \| "available" \| "both" \| false`, default `"unavailable"`): per day column in time grids, per resource column/row (plan 10), per day cell in month views (only when partial: full days use cell attributes). Pieces use the same position properties as events (05 E10) | Shading closed hours, lunch breaks, holidays, maintenance |
| V10 | Interaction | `availabilityBlocksInteraction` (default `true`): range selection (05 E14) and moves/resizes (09) that cover unavailable time are invalid previews (`data-invalid`) and cannot be confirmed. `validateSelection` / `validateEventChange` still run afterwards (decided, §11.2) | What looks closed is not bookable by drag; apps can turn it off for "warn only" UIs |
| V11 | Events as availability | Helper `availabilityFromEvents(events, { resourceId? }) → Rule[]` (in `/calendar`) turns existing bookings into `blocked` `range` rules | The common "already booked" case without app glue |
| V12 | Labels | Cells, slots and options add the status to their `aria-label` ("unavailable", "partially available") plus the rule reason via `getAvailabilityLabel(rules) → string` (default: the first rule's `reason`). Background pieces are `aria-hidden` | Screen-reader users hear why a time is blocked |

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
