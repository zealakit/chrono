# Plan: stage 3 — Event experiences (`/calendar`, events) — part 4 of 4

> Part 4 of 4 of [`05-event-layout.md`](05-event-layout.md) (the index: scope, status and the part table). Section numbers (`§N`) are unchanged by the split. Shared rules: [`00-conventions-as-built.md`](00-conventions-as-built.md).

## 13. Implementation guide (added after stages 1–2 shipped)

Read [`00-conventions-as-built.md`](00-conventions-as-built.md) first. This section reconciles the
plan above with the code that exists, fixes ambiguities, and gives worked examples and a per-PR task
list. Decisions E1–E23 stay as written unless a bullet below says otherwise.

### 13.1 Reconciliations with the as-built code (must be handled)

| # | Problem | Resolution |
| --- | --- | --- |
| R1 | **State equality.** `calendar/internal/equal.ts` compares `JSON.stringify` of the whole state. Segments hold the app's original event objects (E1), which may contain cycles, `Date`s or large payloads. | Replace `deepEqual(state)` with a **field-wise comparer**: compare the existing JSON-safe fields as today, and compare `events`, `more`, `allDayRow` by **reference** of memoized layout results. Layout functions are memoized on (`events` identity, `visibleRange`, layout options, display zone) so unchanged inputs return the same array. Keep the comparer in `calendar/internal/equal.ts`; add a test that an event object with a cycle does not throw and that re-rendering with the same `events` array does not notify. Segment objects themselves stay JSON-safe **except** the `event` field, which is excluded from any structural comparison. |
| R2 | **`style` is forbidden in attribute records** (`calendar-attributes.test.ts` rejects `style`/`class`; adapters' `no-styles.test.ts` rejects any `[style]` in markup and greps `dist` for `style:`/`style=`). E10 needs `--chrono-*` custom properties. | Convention: **a record key that starts with `--chrono-` is a CSS custom property, not an attribute.** Add `splitProperties(record) → { attributes, properties }` to `foundation/store/attributes.ts` (properties keep numbers as unitless strings). Adapters apply properties with their native API (React `style` object, Vue `style` object, Svelte `style:` directive or `style` string, Vanilla `element.style.setProperty`). Update the tests narrowly: attribute test allows only `--chrono-` keys; the markup test allows `style` attributes whose declarations are **all** `--chrono-*`; the `dist` grep is replaced by a check that the *one* style-applying helper per adapter (`shared/style-properties.*`) exists and no other module sets inline styles. `check-independence`/`no-styles` for visual properties stay unchanged. |
| R3 | **Slot focus keys.** `data-chrono-key` on a time slot would equal the day header's key (`2026-11-17`) and break `focusDateCell`. | Slot cells use the composite key `YYYY-MM-DDTHH:mm` (slot start in the display zone). Add `parseCellKey(key) → { date, time? }` to foundation (a thin wrapper over `parseIsoDate`/`parseIsoDateTime`) and use it in the Vanilla `dateOf()`. The all-day cell of a day keeps the plain `YYYY-MM-DD` key and carries `data-all-day-cell`; this does not clash because day headers stop carrying `data-chrono-key` after E13. Month day cells keep `YYYY-MM-DD`. Event pieces use `data-chrono-event-key`, never `data-chrono-key`. |
| R4 | **`DateTimeInput` does not exist** in foundation (E1/E2 use it). | Add to foundation values: `type DateTimeInput = PlainDateTime \| ZonedDateTime \| string` and `toPlainDateTime(input, displayTimeZone)` in `values/convert.ts`: string with offset or `[Zone]` → `parseIsoZoned` then `withTimeZone(displayZone)`; string without offset → `parseIsoDateTime` (wall time in the display zone); `ZonedDateTime` → `withTimeZone`; `PlainDateTime` → as is. Date-only strings go through `toPlainDate` (all-day). Throws `RangeError` with the offending value in the message. Tests under all four `TZ` values. |
| R5 | **Header focus (04 C7) is tested in four adapters** (`time grid column headers are the focusable row`). E13 reverses it. | Rewrite those tests in the same PR that changes the behavior (PR 4–8): headers have no `tabindex`; slots do; ArrowRight on a slot moves to the same time next day; Home/End = first/last visible day at the same time. Update `controller.getColumnHeaderAttributes(day)` to drop `tabindex`/`data-chrono-key` focus role (keep `data-chrono-key` off headers to avoid key clashes). |
| R6 | **Budgets.** `core/calendar` is at exactly 6 KB. | PR 4 raises `size-budgets.json` to the §6 ceilings (foundation 11, calendar 14, adapters 32), then re-measures `+15 %` per entry. If one entry exceeds its ceiling, move rarely used code (pointer/hit-test) behind its own file and keep it tree-shakable (`sideEffects:false`); do not raise a ceiling. |
| R7 | **Option plumbing.** ~16 new options (§2.6). | Follow the new-option checklist (00 §3). React `CALENDAR_KEYS`, Vue `calendarProps` + `emits` (`update:selectedEventId`, `update:selection`, `eventActivate`, `moreActivate`, `selectRange`), Svelte `$bindable` for `selectedEventId`/`selection`, Vanilla README table. |
| R8 | **Announcer outside `calendar/`.** | It lives in `foundation/a11y/announcer.ts` (stage-1 folder). Bump `size-budgets.json` foundation accordingly. It must use `getGlobalState("announcer", …)` so adapters bundling separate copies share one region, and must be a no-op when `isBrowser()` is false. |

### 13.2 Controller design details

- **Memoization keys.** `layoutKey = events identity + visibleRange (start/end ISO) + displayTimeZone +
  hiddenDays + minEventDuration + longEventsInAllDayRow + dayStart/dayEnd + eventLimit`. Keep a
  single-entry cache per layout kind (month / time-grid / agenda). The cache is module-internal to
  the controller instance (no globals).
- **State field order** (stable, because the comparer walks it): existing fields first, then
  `events`, `more`, `allDayRow`, `nowIndicator`, `selection`, `selectedEventId`, `focus`.
- **`focus` state** is `{ mode: "navigation" | "interaction"; cellKey: string; itemKey?: string }`.
  `cellKey` is the R3 key. `focusedDate` (stage 2) stays and is derived from `cellKey`'s date so
  existing consumers keep working.
- **`handleKeyDown(key, mods)`** stays the single keyboard entry point. Dispatch order:
  selection preview active → `event-focus` (interaction mode) → navigation keys (stage 2 logic,
  extended to slots) → Enter precedence (§2.5). Return `true` only when consumed.
- **`mount(root)` / `unmount()`** register the minute ticker, pointer listeners and the announcer.
  `start()` (stage 2) is unchanged and does not touch the DOM. React/Vue/Svelte call
  `mount(rootElement)` in the same effect that already calls `start()` and `unmount()` on cleanup;
  Vanilla calls `mount(root)` inside `createCalendar`.
- **Pointer pipeline** (`interaction/pointer.ts`): `pointerdown` on `[data-chrono-key]` of a slot/day
  cell (or the all-day cell) starts a selection when `selectable`; `setPointerCapture`; `pointermove`
  throttled with `requestAnimationFrame`; `hitTest(point)` returns `{ cellKey }` (default uses
  `document.elementFromPoint` + `closest("[data-chrono-key]")`; tests pass their own); `pointerup`
  confirms; `pointercancel`/Escape cancels. `pointerType === "touch"`: arm a 400 ms timer on down,
  cancel it on move beyond 8 px or on up; only after it fires does the selection start (E18) and
  `touch-action` handling stays the app's CSS concern (document it).
- **Selection geometry** is pure (`interaction/selection.ts`): input = anchor cell, current cell,
  `slotDuration`, zone; output = proposal (`start ≤ end`, snapped to `slotDuration`, `end` exclusive,
  `end = start + slotDuration` when anchor == current) plus per-day preview pieces from
  `splitIntervalByDay`. Dragging backwards swaps. `maxSelectionDuration` clamps the end and marks
  `data-invalid` only when `validateSelection` returns false (clamping is not invalidation).

### 13.3 Worked examples (use them as golden fixtures)

**Month lanes.** Week row Mon–Sun (`weekStartsOn: 1`), columns 0–6. Events: A all-day Nov 16–18
(inclusive days 16,17,18 → `{start:"2026-11-16", end:"2026-11-19"}`), B timed Nov 17 09:00–10:00,
C all-day Nov 17 (one day), D all-day Nov 18–22. Sort (E6): A (starts col 0), then col 1: C (all-day
before timed), B; then D (col 2). First fit: A lane 0 (cols 0–2); C lane 1 (col 1); B col 1 → lanes
0 and 1 busy → lane 2; D cols 2–6: lane 0 busy at col 2, lane 1 free (C only covers col 1) → lane 1.
Expected `{A:0, C:1, B:2, D:1}`.
Overflow with `eventLimit: 2`: a day with more than 2 lanes shows `limit − 1 = 1` lane (lane 0) and "+N
more". Col 1 has lanes {0,1,2} → shows A, hides C and B → `more = { dayKey: "2026-11-17", count: 2 }`.
Col 2 has lanes {0 (A), 1 (D)} = 2 → no overflow, shows both. Expected hidden pieces: C, B only; D and
A are fully visible (A is visible at col 1 because lane 0 is shown).

**Time-grid columns.** One day, axis `00:00–24:00`. Events A 09:00–10:00, B 09:30–10:30, C
10:00–11:00, D 12:00–13:00 (half-open). A and B overlap, B and C overlap, A and C only touch → one
transitive cluster {A,B,C}. Sort by start then longer first. Columns: A→0, B→1 (A still open), C→0 (A
ended at 10:00). `columns = 2`. Expansion: A's right neighbour column 1 holds B, which overlaps A →
`span 1`; B is rightmost → `span 1`; C: column 1 holds B which overlaps C → `span 1`. D is a
single-event cluster: `column 0, columns 1, span 1`. Geometry: A `top = 9/24 = 0.375`, `height =
1/24 ≈ 0.0416667`. A 5-minute event at 14:00 with `minEventDuration 15` draws `height = 15/1440 ≈
0.0104167`, but its real `end` stays 14:05 (E4). A second cluster: A 09:00–12:00, E 09:00–09:30, B 09:30–10:00, C 10:30–11:00. Sort (start, then
longer first): A, E, B, C. A → column 0. E → column 0 is busy (A), so column 1. B starts 09:30: column 0
busy (A), column 1 free (E ended at 09:30, half-open) → column 1. C starts 10:30: column 1 free (B ended
10:00) → column 1. `columns = 2`; every event has `span 1` (column 1's neighbours on the right do not
exist, and A's right neighbour column 1 holds events that overlap A). The rule is **lowest free column
at the event's start, in sort order**.

**DST (E9).** New York 2026-03-08: a zoned event `01:30-05:00 → 03:30-04:00` (real 1 h) occupies wall
positions 01:30 → 03:30 (axis height 2 h). A plain event starting 02:30 resolves with `"compatible"` to
03:30. 2026-11-01: events `01:15-04:00` and `01:15-05:00` both map to wall 01:15 and form one cluster.
Lord Howe 2026-10-04 (gap 02:00→02:30) and 2026-04-05 (overlap 01:30–02:00) test the 30-minute shifts.
Assert: no `NaN`, `height ≥ 0`, `top + height ≤ 1`, deterministic output.

**All-day exclusive end (E3).** `{ start: "2026-11-17", end: "2026-11-18" }` is one day. `end ===
start` or missing `end` → one day plus a development warning. `fromInclusiveEndDate("2026-11-20")`
returns `"2026-11-21"` (and accepts `PlainDate`).

### 13.4 Test-support additions

- `packages/core/tests/support/oracle.ts`: a deliberately naive O(n²) implementation of month lane
  packing and time-grid column assignment. Invariant tests compare the fast layout with the oracle on
  1,000 seeded sets (mulberry32, as in `constraints.test.ts`) and assert the structural invariants of
  §5. A bug in the oracle is cheaper to find than a bug in a golden file.
- Golden fixtures live in `packages/core/tests/fixtures/events/*.json` with the shape
  `{ "name", "options": {weekStartsOn, locale, timeZone, visibleRange, …}, "events": [...],
  "expected": [...] }`. Write them by hand from the worked examples; **never** regenerate them from the
  implementation.
- Adapter reference compositions (`tests/support/reference.*`) gain an events view: month cells with
  `CalendarEvents`, time grid with an events layer and the all-day row, agenda items. All four
  adapters must keep the **same element structure** or parity breaks.
- Parity scenarios to add: `events-month`, `events-week-overlap`, `events-agenda`, `selection-preview`,
  `overflow-more`. Snapshot attributes only; ignore `style` except `--chrono-*` declarations
  (sorted).

### 13.5 PR task list (files and acceptance)

| PR | Files to create / change | Done when |
| --- | --- | --- |
| 1 | `calendar/events/{types,normalize,sort,month-layout,overflow}.ts`, foundation `DateTimeInput` + `toPlainDateTime` + `fromInclusiveEndDate`, fixtures, oracle, tests | `pnpm --filter @zealakit/chrono-core test` green in all four zones; `check:domains` green; budgets unchanged |
| 2 | `all-day-row`, `time-grid-layout`, `now-indicator`, DST tests, bench | invariants pass on 1,000 sets; bench printed |
| 3 | `agenda-layout`, `interaction/event-focus`, `interaction/selection` | all key tables of §2.5 covered; no DOM access (`grep -r "document\|window" src/calendar/interaction/{event-focus,selection}.ts` empty) |
| 4 | foundation `ticker`, `announcer`, `splitProperties`, `parseCellKey`; controller additions (R1, R3, R5); `pointer`/`hit-test`; `size-budgets.json` | core tests green; `check:size` green with the new ceilings; existing stage-2 adapter tests still pass except the intentionally rewritten header-focus tests |
| 5–8 | One adapter each: parts, getters, `mount`, style-property helper, option plumbing, tests, parity scenarios | adapter suite + parity green; the other adapters unchanged |
| 9 | Examples, READMEs (EN/VI/CN, incl. changelog and the updated `> **Note**` everywhere), skills, agent files, version `0.3.0` | full routine in 00 §5 green |

### 13.6 Pitfalls checklist

- Keys: `focusDateCell` prefers elements **without** `data-outside-month`; month cells for adjacent days
  exist twice in multi-month — events must render on the in-month cell only.
- Do not render event segments twice for the same week row (multi-day pieces belong to one row cell
  host: the cell at `startColumn`; later columns get spacer/continuation attributes).
- A single `ResizeObserver` per calendar, disconnected in `unmount()`; SSR and missing
  `ResizeObserver` → limit 3 (I6).
- React: attach pointer listeners in the same effect as `mount`; do not use React synthetic pointer
  events for drag (capture + rAF throttle live in core).
- Vue: the new getters must be wrapped in `tracked()`; Svelte: derive with `$derived.by`.
- `getEventLabel` is optional; never assume `event.title`.
- Announce through the shared announcer only after user actions, never on render.
