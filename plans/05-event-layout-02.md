# Plan: stage 3 — Event experiences (`/calendar`, events) — part 2 of 4

> Part 2 of 4 of [`05-event-layout.md`](05-event-layout.md) (the index: scope, status and the part table). Section numbers (`§N`) are unchanged by the split. Shared rules: [`00-conventions-as-built.md`](00-conventions-as-built.md).

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
  calendarId?: string | number;          // E23
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
`setEventLimit`. Measurement runs only in the browser after mount. During SSR, and in browsers
without `ResizeObserver`, the limit is `3` (documented; apps that need exact output pass a
number; 02 §2.8 I6).

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
