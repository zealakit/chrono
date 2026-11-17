# Plan: stage 3 — Event experiences (`/calendar`, events)

Status: **proposal — not implemented**.

Order: **5 of N**. Runs after `04-calendar-views.md` (`0.2.0` published). Implements stage 3
of `02-implement-business-flow.md` §9: flows **F3** (events in a month view), **F4** (events
in a week / work week / day time grid), **F5** (agenda) and **F6** (select and create events).
The next plans are `06-date.md` and `07-time.md` (stage 4).

Goal: fill the empty views from stage 2 with events. Chrono computes **where** every event
goes (lanes, columns, sizes, overflow, continuations) and handles event focus, selection and
range creation. The app renders each event and owns the data.

**Scope rule:**
- Calendar domain only. Same `/calendar` entry; no new subpath.
- Events are **read-only** in this stage: no dragging, moving or resizing (stage 5, F7).
- Chrono never stores, fetches or validates events against business rules (02 §2.4,
  §2.8). It receives an array and returns layout plus proposals.
- No styling (02 §2.8): positions are unitless CSS custom properties the app's CSS uses.
- Signatures below are **shapes** (TypeScript as spec, not code).

---

## 1. Decisions taken in this plan

| # | Topic | Decision | Why |
| --- | --- | --- | --- |
| E1 | Event input | `events: readonly TEvent[]` where `TEvent extends CalendarEventInput` (`id`, `start`, `end`, `allDay?`, `recurringId?`). The app's own fields pass through untouched; every layout segment holds a reference to the original object | No mapping layer for the app. Generic types keep the app's fields typed in render callbacks |
| E2 | Timed event values | `start`/`end` accept `PlainDateTime`, `ZonedDateTime` or ISO strings. Zoned values are converted to the calendar's display `timeZone`. Plain values are wall time in the display zone | Matches 03 D7/D9. Apps that store UTC pass zoned values or ISO strings with offsets |
| E3 | All-day `end` | **Exclusive** (decided): `end` is the day **after** the last day shown, as in iCal (`DTEND;VALUE=DATE`), Google Calendar and FullCalendar. A one-day event on Nov 17 is `{ start: "2026-11-17", end: "2026-11-18" }`. Helper `fromInclusiveEndDate(lastDay)` for data that stores the last day. All-day selection proposals (E14) use the same exclusive end | Apps pass calendar data straight from common sources without conversion. Event data is half-open like timed events (03 D9). Date **picker** ranges (Date domain) stay inclusive, because users read a picked range by its last day |
| E4 | Zero and short events | A timed event shorter than `minEventDuration` (default 15 min) is **drawn** with that height, but its real `start`/`end` are kept for overlap tests and labels | Point events stay visible and clickable |
| E5 | Long timed events | Timed events lasting **24 h or more** go to the all-day row in time grids (option `longEventsInAllDayRow`, default `true`). Shorter events crossing midnight are split per day | What Google Calendar and Outlook do. Keeps tall columns readable |
| E6 | Month lanes | Per week row: sort by start day, then longer span first, then all-day before timed, then start time, then `id`. Greedy first-fit lane packing | Stable, predictable, the common algorithm. `id` tie-break makes output deterministic |
| E7 | Overflow | `eventLimit: number \| "auto"` (default `"auto"`). When a day has more lanes than the limit, it shows `limit − 1` lanes plus a "+N more" control. `"auto"` = the adapter measures cell height and event height with `ResizeObserver` and passes a number to the controller | Apps rarely know row heights up front. Measurement is DOM work, so it stays in the adapters |
| E8 | Time-grid overlap | Cluster overlapping events (transitive), assign the first free column, then expand each event to the right until it hits a collision. Output `column`, `columns`, `span` | Same visual result as Outlook and FullCalendar. One mode in this stage (no "stacked" cascade) |
| E9 | Time axis and DST | Positions use **wall time** on the visible axis (`dayStart`–`dayEnd`). On a spring-forward day the skipped hour shows no events (start resolved with `"compatible"`). On a fall-back day both occurrences of the repeated hour map to the same wall time and are laid out as overlapping | How mainstream calendars behave. Keeps the grid regular |
| E10 | Positions | Unitless numbers written as CSS custom properties: `--chrono-event-top` and `--chrono-event-height` (fractions 0–1 of the visible axis), `--chrono-event-column`, `--chrono-event-columns`, `--chrono-event-span`, `--chrono-event-lane`, `--chrono-event-start` / `--chrono-event-days` (month columns). The same numbers are also in the layout data | The app decides units and layout method (absolute, CSS grid, canvas). Nothing visual is set (02 §2.8) |
| E11 | Event keyboard model | **Enter into cell** (decided, APG grid "interactive cell" pattern). The view is **one tab stop** (the grid). Arrows move between cells (navigation mode). Enter or F2 on a cell that has events switches to **interaction mode** inside that cell: focus goes to the cell's first event; ↑/↓ and Tab/Shift+Tab move between the cell's events and its "+N more" button (wrapping); Escape or F2 returns focus to the cell. Full key tables in §2.5 | Matches the APG grid pattern screen-reader users know. The view stays a single tab stop |
| E12 | Event selection and activation | Click, or Space in interaction mode, **selects** (`selectedEventId`, controlled or not, `onSelectedEventChange`). Double-click, or Enter in interaction mode, **activates** (`onEventActivate(event, info)`): the app opens its editor or details | Same split as list boxes. "Open" never happens by accident |
| E13 | Slot focus | Time slots become focusable grid cells (rows = slots, columns = visible days). Day headers are no longer focusable. This **changes the stage-2 behavior** (04 C7) and is noted in the 0.3.0 changelog | 04 C7 planned this. Pre-1.0 minor releases may change behavior (04 C15) |
| E14 | Range creation | `selectable: boolean` (default `false`). **Time grid: drag across days** (decided) — the selection is one **continuous** timed range from the anchor (day + slot) to the pointer (day + slot), snapped to `slotDuration`, not a rectangle. Month grid and all-day row: drag across days (all-day range). Keyboard: Shift+↑/↓ extend by one slot, Shift+←/→ move the end to the same time on the previous/next day, Enter confirms, Escape cancels (Enter precedence: §2.5). Optional `maxSelectionDuration` (minutes). Result: `onSelectRange(proposal)` (02 §2.4) | Covers "create an event" (BRD §7.2), including overnight shifts and multi-day bookings, with full keyboard parity (02 §7) |
| E15 | Selection lifetime | After `onSelectRange`, the selection stays visible until the app calls `clearSelection()` or a new selection starts. Optional controlled `selection` prop | The app usually opens a form next to the selection, then clears it |
| E16 | Validation while selecting | `validateSelection(proposal) → boolean` is **synchronous** and runs on every preview step; invalid previews get `data-invalid` and cannot be confirmed. Async checks happen in the app after `onSelectRange` | Async validation during a pointer drag causes flicker and races |
| E17 | Hit testing | Pointer position → slot/day via `document.elementFromPoint` + `closest("[data-chrono-key]")` and `data-slot-start`, never via geometry math. The adapter can pass its own `hitTest(point)` (tests use this) | Works with any CSS, transforms, zoom and RTL. No layout reads beyond one call per move |
| E18 | Touch | Selection on touch starts after a 400 ms long press. A short touch scrolls as usual | Avoids hijacking scroll |
| E19 | Live clock | When `now` is **not** passed, the controller starts a minute ticker while mounted (browser only, aligned to the next minute). It updates `today`, the now-indicator and `data-past`, and handles midnight rollover. When `now` is passed, no timer runs (the app controls time) | Completes 04 C8. SSR and tests stay deterministic by passing `now` |
| E20 | Announcer | `foundation/a11y/announcer.ts`: one shared visually-hidden polite live region per document (`getGlobalState`), created lazily on first announcement, or an app element passed as `announcer`. Used for selection created/cancelled and event selected | 03 deferred it to here. The visually-hidden inline style is the one allowed exception in 02 §2.8 |
| E21 | Recurring occurrences | Occurrences are passed already expanded (02 F10 v1). `recurringId` is passed through and shown as `data-recurring` | No rule engine yet (stage 5) |
| E22 | "+N more" popup | Chrono fires `onMoreActivate(date, hiddenEvents)` and gives the button its attributes. The app shows its own popup, dialog or day view | Chrono has no popups (02 §2.2, §2.8) |

---

## 2. Core: `calendar/events/` and `calendar/interaction/`

### 2.1 Folders

```text
packages/core/src/calendar/
├── events/
│   ├── types.ts            # CalendarEventInput, NormalizedEvent, segment types
│   ├── normalize.ts        # parse values, convert zones, filter to visibleRange, dedupe ids
│   ├── sort.ts             # E6 comparator (shared by every layout)
│   ├── month-layout.ts     # week-row segments, lanes, continuation flags
│   ├── overflow.ts         # eventLimit → visible lanes, "+N more" per day
│   ├── all-day-row.ts      # time-grid all-day row (month packing on one row)
│   ├── time-grid-layout.ts # per-day split, clusters, columns, expansion, top/height
│   ├── agenda-layout.ts    # per-day groups for the list view
│   └── now-indicator.ts    # now → { dayKey, top } for the visible axis
├── interaction/
│   ├── selection.ts        # pure selection state machine (start/extend/confirm/cancel)
│   ├── event-focus.ts      # pure E11 navigation over the visible event order
│   ├── pointer.ts          # DOM: pointer capture, long press, hitTest → selection actions
│   └── hit-test.ts         # default elementFromPoint-based hitTest
└── controllers/
    └── calendar-controller.ts   # extended (§2.6)
packages/core/src/foundation/
├── a11y/announcer.ts       # E20
└── store/ticker.ts         # E19 minute ticker (setTimeout chain, no DOM)
```

Pure: everything in `events/`, `interaction/selection.ts`, `interaction/event-focus.ts`.
DOM: `interaction/pointer.ts`, `interaction/hit-test.ts`, `foundation/a11y/announcer.ts`, only
from lifecycle code. `check-domains.mjs` rules are unchanged (`calendar` → `foundation`).

### 2.2 Event types

```ts
type CalendarEventInput = {
  id: string | number;
  start: DateTimeInput | DateInput;     // DateInput when allDay
  end: DateTimeInput | DateInput;
  allDay?: boolean;
  recurringId?: string | number;
};
type EventSegmentBase<TEvent> = {
  key: string;                          // `${id}:${firstDayKey}`
  event: TEvent;                        // the app's original object
  start: PlainDateTime; end: PlainDateTime;   // in display zone, real values
  allDay: boolean;
  continuesBefore: boolean; continuesAfter: boolean;
  past: boolean;                        // ended before now
};
type MonthSegment<T> = EventSegmentBase<T> & {
  week: number; startColumn: number; days: number; lane: number; hidden: boolean;
};
type TimeGridSegment<T> = EventSegmentBase<T> & {
  dayKey: string; top: number; height: number;   // fractions of the visible axis
  column: number; columns: number; span: number;
};
type AgendaItem<T> = EventSegmentBase<T> & { dayKey: string };
```

`normalize.ts` rules:
- `end < start` → swap and warn in development. `end === start` on a timed event is kept
  (E4). All-day: `end` is exclusive (E3); `end === start` (or a missing `end`) is treated as a
  one-day event and warns in development.
- Duplicate `id` → warn in development; the later one gets a suffixed internal key so
  layout keys stay unique.
- Events fully outside `visibleRange` are dropped before layout. Events fully on hidden days
  are dropped; events partly on hidden days are clipped to visible columns
  (`continuesBefore`/`After` set).
- Results are memoized on the `events` array identity + `visibleRange` + layout options, so
  re-rendering with the same array costs nothing.

### 2.3 Month layout (F3) and overflow

1. Split each event into one piece per week row it touches.
2. Sort pieces per row with the E6 comparator.
3. First-fit lane assignment per row; a piece occupies `startColumn … startColumn + days − 1`
   in its lane.
4. Overflow per day (`overflow.ts`): with limit `L`, lanes `0 … L − 2` stay visible when the
   day has more than `L` lanes; the rest are `hidden: true` and counted in
   `more: { dayKey, count, events }`. A multi-day piece is hidden only in the days where its
   lane is past the visible lanes — the layout splits it there so it never shows on some days
   and silently vanishes on others.
5. Timed single-day events appear as one-day pieces (they get `allDay: false`, so the app
   can render them as "dot + time" chips).

### 2.4 Time grid layout (F4)

1. All-day row: all-day events + long timed events (E5) → `all-day-row.ts` (step 2–4 of §2.3
   on one row, with its own `eventLimit`, default 3).
2. Timed events: split per day with `splitIntervalByDay` (03 §3.4), clip to
   `dayStart`–`dayEnd`, compute `top`/`height` in wall time (E9), apply `minEventDuration`
   (E4).
3. Per day: sort by start, then longer first; build clusters of transitively overlapping
   events; assign each event the lowest free column; `columns` = cluster column count; expand
   `span` rightwards while no event in that column overlaps it.
4. Now-indicator (`now-indicator.ts`): `{ dayKey, top } | null` when now is inside the visible
   range and axis.

Performance target (02 §7): 1,000 events in a week < 16 ms in Node. Reported, not gated.

### 2.5 Agenda (F5) and the keyboard model (E11)

- `agenda-layout.ts`: one group per day in the range; multi-day events appear in every day
  they cover (with continuation flags); sorted with E6. `showEmptyDays` (default `false`).
- `event-focus.ts`: pure state machine with two modes, `navigation` (focus on a cell) and
  `interaction` (focus on an event or "+N more" inside one cell).
  `(state, key, modifiers, ctx) → nextState`.

**Which cell owns an event:**

| View | Cell | Events reachable from it |
| --- | --- | --- |
| Month | day cell | that day's visible pieces, then its "+N more" button |
| Time grid, timed area | slot (row = slot, column = day) | timed events that **overlap** the slot on that day, so every slot an event covers reaches it |
| Time grid, all-day row | the all-day cell of each day (row 0 of the grid) | that day's all-day pieces, then its "+N more" |
| Agenda | day item (roving ↑/↓ over days, Home/End) | that day's events |

**Navigation mode (focus on a cell):**

| Key | Action |
| --- | --- |
| Arrows, Home/End, PageUp/PageDown (+Shift) | Move between cells as in stage 2 (03 §3.6) |
| Enter, F2 | Cell has events → interaction mode on the first event. Cell has none → Enter precedence below |
| Shift+Enter | Always `onDateActivate` for the cell's date (keeps 04 C6 reachable on cells with events) |
| Shift+arrows | With `selectable`: start or extend a range selection (E14) |
| Escape | Cancel an active selection preview |

**Enter precedence in navigation mode** (first match wins):

1. A selection preview is active → confirm it (`onSelectRange`).
2. The cell has events → enter interaction mode.
3. `selectable` and a time-grid slot → confirm a one-slot selection.
4. Otherwise → `onDateActivate` (stage-2 behavior).

**Interaction mode (focus on an event or "+N more" inside one cell):**

| Key | Action |
| --- | --- |
| ↓ / Tab | Next item in the cell (wraps to the first) |
| ↑ / Shift+Tab | Previous item (wraps to the last) |
| Home / End | First / last item |
| Space | Select the focused event (E12) |
| Enter | Activate the focused event, or `onMoreActivate` on "+N more" |
| Escape, F2 | Back to navigation mode on the owning cell |

Rules:

- Only one element in the whole view has `tabindex="0"`: the focused cell in navigation mode,
  or the focused item in interaction mode. Tab in navigation mode leaves the view (single tab
  stop).
- Clicking an event puts the view in interaction mode on that event's cell.
- Navigating away (prev/next/view change), or the focused event disappearing from the layout,
  returns to navigation mode on the nearest valid cell.
- Entering a cell announces its event count through the announcer (messages `cellEvents`,
  "3 events"). The cell's `aria-label` also includes the count.

### 2.6 Controller additions

`CalendarOptions<TEvent>` gains:

```ts
events?: readonly TEvent[];
eventLimit?: number | "auto";           // month + all-day row
allDayEventLimit?: number;              // time-grid all-day row, default 3
minEventDuration?: number;              // minutes, default 15
longEventsInAllDayRow?: boolean;        // default true
selectedEventId?: string | number | null; defaultSelectedEventId?: …;
onSelectedEventChange?: (id: string | number | null, event: TEvent | null) => void;
onEventActivate?: (event: TEvent, info: { source: "pointer" | "keyboard"; dayKey: string }) => void;
onMoreActivate?: (date: PlainDate, events: TEvent[]) => void;
selectable?: boolean;
maxSelectionDuration?: number;          // minutes, E14
selection?: SelectionProposal | null; onSelectionChange?: …;          // E15
onSelectRange?: (proposal: SelectionProposal) => void;
validateSelection?: (proposal: SelectionProposal) => boolean;        // E16
hitTest?: (point: { x: number; y: number }) => HitTarget | null;     // E17
announcer?: HTMLElement | false;                                      // E20
```

```ts
type SelectionProposal = {
  kind: "create";
  start: PlainDateTime | ZonedDateTime | PlainDate;
  end: PlainDateTime | ZonedDateTime | PlainDate;   // half-open; PlainDate (exclusive) when allDay
  allDay: boolean;
  source: "pointer" | "keyboard";
};
```

`CalendarState` gains `events` (the segments of the active layout), `more` (per-day
overflow), `allDayRow` (time grid), `nowIndicator`, `selection` (preview or confirmed),
`selectedEventId`, `focus: { mode: "navigation" | "interaction"; cellKey; itemKey? }`.

New actions: `selectEvent(id | null)`, `activateEvent(key, source)`, `focusEvent(key)`,
`enterCell(cellKey)`, `exitCell()`, `handleEventKeyDown(key, modifiers)`, `startSelection(target, source)`,
`extendSelection(target)`, `confirmSelection()`, `cancelSelection()`, `clearSelection()`,
`setEventLimit(number)` (used by `"auto"` measurement), `mount(root)` / `unmount()` (starts and
stops the ticker and pointer listeners; SSR never calls them).

New attribute getters (plain records, 04 §2.5 rules):

| Element | Attributes |
| --- | --- |
| Event | `role="button"`, `aria-label` (title is the app's: Chrono builds "time range, day" and the app passes its own label text through `getEventLabel`), `aria-pressed` (selected), `tabindex` (0 only on the focused item in interaction mode, −1 otherwise), `data-chrono-event`, `data-chrono-event-key`, `data-selected`, `data-focused`, `data-all-day`, `data-continues-before`, `data-continues-after`, `data-past`, `data-recurring`, and the E10 custom properties (only `--chrono-*` in `style`) |
| Cell event list | `role="group"`, `aria-label` (messages `events`), `data-interacting` while the cell is in interaction mode |
| "+N more" | `aria-label` ("3 more events"), `data-overflow`, `data-chrono-key` |
| Time slot (now focusable) | `role="gridcell"`, `aria-label` (day + time), `tabindex`, `data-chrono-key`, `data-slot-start`, `data-working-hours`, `data-selecting` (in preview), `data-invalid` |
| Time grid | `role="grid"`, `aria-labelledby`, `aria-rowcount`/`aria-colcount` |
| Now indicator | `aria-hidden="true"`, `data-now`, `--chrono-now-top` |
| Selection preview | One element **per covered day** (the range is split with `splitIntervalByDay`): `aria-hidden="true"`, `data-selection`, `data-invalid`, `data-continues-before`/`after`, position properties like an event |
| Day cell, all-day cell, slot (extended) | `data-selecting` during a range drag, `data-has-events`, `data-interacting` (its events have focus), `aria-label` includes the event count |

`aria-label` text uses `getEventLabel?: (event) => string` (option, default: none → only the
time range and day). Event titles are app data; Chrono never assumes a `title` field.

New default messages (English only, 03 D13): `events`, `moreEvents` ("{count} more events"),
`allDay`, `cellEvents` ("{count} events"), `selectionCreated` ("Selected {range}"),
`selectionCancelled`, `eventSelected`.

---

## 3. Adapters

### 3.1 New parts (same names in React, Vue, Svelte)

| Part | Default element | Notes |
| --- | --- | --- |
| `CalendarEvents` | `div` | The event list of one cell (E11). Children/slot receive that cell's segments |
| `CalendarEvent` | `div` | One segment. Children/slot render the app's content (generic over `TEvent`) |
| `CalendarMoreButton` | `button` | "+N more" (E22) |
| `CalendarAllDayRow` | `div` | Time grid all-day row |
| `CalendarNowIndicator` | `div` | Rendered only when the indicator is in view |
| `CalendarSelectionPreview` | `div` | Rendered once per covered day column while selecting, positioned like an event |

Existing parts change: `CalendarCell` (month) can host `CalendarEvents`; `CalendarTimeGridSlot`
becomes focusable (E13); `CalendarTimeGridColumnHeader` stops being focusable.

`eventLimit: "auto"`: `CalendarMonthGrid` measures the first visible cell's content box and
the first rendered event's block size with one shared `ResizeObserver`, then calls
`setEventLimit`. Measurement runs only in the browser after mount. During SSR the limit is
`3` (documented; apps that need exact SSR output pass a number).

### 3.2 Per framework

| Framework | Additions |
| --- | --- |
| React | `useCalendar` returns `getEventProps(segment)`, `getMoreProps(day)`, `getSlotProps(slot, day)`, `getSelectionPreviewProps()`. Pointer listeners attach on the root in an effect (`mount`/`unmount`). Generic `TEvent` flows into render-prop types |
| Vue | Same getters; scoped slots typed with `TEvent` via `defineComponent` generics; `v-model:selectedEventId`, `v-model:selection` |
| Svelte | Snippets receive typed segments; `bind:selectedEventId`, `bind:selection`; an action (`use:calendarRoot`) mounts pointer handling |
| Vanilla | `createCalendar` delegates `pointerdown`/`pointermove`/`pointerup`/`keydown` on the root; templates stamp event attributes with `applyAttributes`. `calendar.syncFocus()` also restores event focus after the app re-renders |

All adapters: no Provider, no CSS, no class names of their own (02 §2.5, §2.8).

---

## 4. Entry points

- Same `/calendar` subpath and root re-export. New exports: the parts in §3.1, event and
  segment types, `SelectionProposal`, and depth-1 utilities apps use without components
  (02 §4): `layoutMonthEvents`, `layoutTimeGridEvents`, `layoutAgenda`,
  `fromInclusiveEndDate`.
- `entries.test.ts` (04 §4) covers the new names automatically.

---

## 5. Tests

Core (four `TZ` zones, 03 §5):

| File | Proves |
| --- | --- |
| `events/normalize.test.ts` | Value parsing, zone conversion, swap, duplicates, filtering to range, hidden-day clipping, memoization |
| `events/month-layout.test.ts` | Golden fixtures (`tests/fixtures/events/month-*.json`: input + expected segments) for week splits, lanes, continuation flags, all 7 `weekStartsOn` values |
| `events/overflow.test.ts` | Limits 1–5, multi-day pieces split at hidden lanes, `more` counts |
| `events/time-grid-layout.test.ts` | Golden fixtures for clusters, columns, expansion, `minEventDuration`, midnight splits, E5 threshold, clipping to `dayStart`/`dayEnd` |
| `events/dst.test.ts` | New York 2026-03-08 and 2026-11-01, Lord Howe 2026-04-05 and 2026-10-04: E9 behavior, no NaN/negative heights |
| `events/invariants.test.ts` | Seeded random event sets (no library): no two month pieces share a lane on the same day; no two time-grid events overlap in the same column; expansion never covers a colliding event; every input event that is in range appears exactly once per covered visible day (visible or counted in `more`) |
| `events/agenda-layout.test.ts` | Groups, multi-day repeats, empty days on/off |
| `interaction/selection.test.ts` | Start/extend/confirm/cancel, snapping, continuous ranges across days both directions (dragging backwards swaps), per-day preview pieces incl. hidden days and DST days, Shift+←/→ keeps the time, `maxSelectionDuration`, `validateSelection` blocking confirm, controlled `selection` |
| `interaction/event-focus.test.ts` | Both modes and every key in §2.5 for month, time grid (slots + all-day row) and agenda; Enter precedence order; Shift+Enter; wrapping; return to navigation on prev/next or when the event disappears; RTL arrows in navigation mode |
| `foundation/ticker.test.ts` | Minute alignment, midnight rollover, no timer when `now` is passed (fake timers via `node:test` mock timers) |
| `foundation/announcer.test.ts` | Lazy creation, single shared region across two core copies, app-provided element |
| `bench.test.ts` (extend) | 1,000 events in a week, 300 events in a month. Report only |

Adapters (each of React, Vue, Svelte, Vanilla):

| File | Proves |
| --- | --- |
| `calendar-events.test.ts` | Rendering in month, time grid, agenda; custom properties present; app fields reach render callbacks |
| `calendar-event-keyboard.test.ts` | Single tab stop, Enter/F2 into a cell, Tab wraps inside the cell, Escape back, Space selects, Enter activates, Shift+Enter activates the date, only one `tabindex="0"` at any time |
| `calendar-selection.test.ts` | Pointer selection with a stubbed `hitTest`, long press on touch, keyboard Shift+arrows/Enter/Escape, `onSelectRange` payload |
| `calendar-overflow.test.ts` | Numeric limit, `"auto"` with a stubbed `ResizeObserver`, `onMoreActivate` |
| `parity.test.ts` (extend) | New scenarios in `tests/fixtures/calendar-parity.json` for events and selection; identical snapshots across adapters |
| `ssr.test.ts` (extend) | Server render with events + `now` equals the client's first render; no ticker started on the server |
| `no-styles.test.ts` (extend) | Event elements carry only `--chrono-*` properties in `style` |

Manual a11y check: VoiceOver and NVDA on the React example — entering and leaving cells,
event counts announced, selection announcements, "+N more".

---

## 6. Size budgets

`size-budgets.json` ceilings are raised in this plan (04 §6 rule: a plan change is required):

| Entry | Stage 2 ceiling | Stage 3 ceiling (gzip) |
| --- | --- | --- |
| `core/foundation` | 10 KB | 11 KB (announcer, ticker) |
| `core/calendar` | 6 KB | 14 KB |
| `<adapter>/calendar` (incl. reached core) | 20 KB | 32 KB |

Budgets inside the ceilings are re-measured +15 % as in 04 §6.

---

## 7. Examples

The "Outlook-like shell" from stage 2 gets events:

- A static data set generated relative to today (meetings, overlaps, multi-day trip, all-day
  holiday, a recurring stand-up as expanded occurrences, a zero-length reminder).
- "+N more" opens the browser's native `<dialog>` (owned by the example; no UI library).
- Drag-to-create in week view opens an inline form in the example; saving adds the event to
  the example's own state (shows that persistence is the app's job). Keyboard creation works
  the same way.
- Selected event details in a side panel; Enter opens the "edit" form.
- Next.js: server-rendered events with `now` passed from the server.
- All CSS stays in each example's `styles.css` (02 §2.8). One example uses absolute
  positioning with the custom properties, another uses CSS grid, to show both are possible.

---

## 8. Docs and agent files

- Adapter READMEs (EN/VI/CN): events section (input shape, all-day **exclusive** end
  (with a one-day example) and `fromInclusiveEndDate`, the difference from inclusive picker
  ranges, time zones), parts table, layout custom properties table, keyboard
  table (Enter into cell, Shift+Enter), selection and proposals, `"auto"` limit and its SSR note, live clock
  and `now`.
- 0.3.0 changelog section in each README: the behavior changes from stage 2 — slots
  focusable, day headers not (E13); Enter on a cell with events enters the cell, Shift+Enter
  activates the date (E11).
- Root README: "0.3.0 — Calendar views + events".
- `skills/chrono-*.md`: rendering events, the keyboard model, creating events by selection.
- `.agents/AGENTS.md` + skill: layout invariants (§5) as hard rules for future changes; scope
  line "events shipped (stage 3)".

---

## 9. Delivery (PR breakdown)

| PR | Content |
| --- | --- |
| 1 | `events/types`, `normalize`, `sort`, `month-layout`, `overflow` + golden fixtures + invariants |
| 2 | `all-day-row`, `time-grid-layout`, `now-indicator`, DST tests, benchmark |
| 3 | `agenda-layout`, `interaction/event-focus`, `interaction/selection` |
| 4 | Foundation `ticker` + `announcer`; controller additions, attribute getters, `pointer`/`hit-test`; size budgets |
| 5 | React |
| 6 | Vue |
| 7 | Svelte |
| 8 | Vanilla + parity fixtures complete |
| 9 | Examples, READMEs (EN/VI/CN), skills, agent files. Version `0.3.0` |
| Release | Same manual steps as 04 §9 Release: checks, tarball inspection, the **maintainer** publishes `0.3.0`, tag `v0.3.0`, GitHub release notes including the E13 change |

PRs 5–8 can run in parallel after PR 4.

---

## 10. Definition of done

- `pnpm build`, `typecheck`, `test`, `lint`, `check:deps`, `check:domains`, `check:size`,
  `readme:check`, `pack:packages` exit 0. All examples build, including Next.js SSR.
- F3, F4, F5, F6 acceptance (02 §5) covered by core and adapter tests; all §5 invariants pass
  on 1,000 seeded random sets per run.
- Parity snapshots identical across the four adapters.
- Benchmarks recorded in the PR; manual screen-reader check recorded.
- After publishing: fresh-project smoke test of `0.3.0` per framework (04 §10).

---

## 11. Out of scope (later stages)

- Moving, resizing, dragging events, auto-scroll while dragging, cross-resource moves (stage
  5, F7).
- Resources, timeline, availability backgrounds, recurrence expansion (stage 5, F8–F10).
- A "stacked" overlap mode (E8) — candidate for stage 5
  if users ask.
- Any popup for "+N more" or event details (02 §2.8; examples only).

---

## 12. Open questions

1. ~~**Event keyboard model**~~ — **decided: Enter into cell** (APG interactive-cell pattern,
   one tab stop per view). Key tables in §2.5.
2. ~~**All-day end date**~~ — **decided: exclusive** (iCal/Google/FullCalendar style). Helper
   `fromInclusiveEndDate` for other data. Picker ranges stay inclusive (E3).
3. ~~**Time-grid range creation**~~ — **decided: across days**, as one continuous timed range
   from anchor to pointer (E14).

All open questions are decided.
