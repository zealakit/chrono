# Plan: stage 2 — Calendar views and navigation (`/calendar`) — part 2 of 3

> Part 2 of 3 of [`04-calendar-views.md`](04-calendar-views.md) (the index: scope, status and the part table). Section numbers (`§N`) are unchanged by the split. Shared rules: [`00-conventions-as-built.md`](00-conventions-as-built.md).

## 2. Core: `calendar/` (`@zealakit/chrono-core/calendar`)

### 2.1 Folders

```text
packages/core/src/calendar/
├── index.ts                 # public calendar surface (re-exports only)
├── navigation/
│   ├── view-definition.ts   # ViewDefinition type, built-in views, resolveView()
│   ├── range.ts             # getRange(), getVisibleRange() for a definition + anchor
│   ├── navigate.ts          # prev/next/today/goTo/setView/setRange as pure functions
│   └── title.ts             # getCalendarTitle(): text + parts
├── views/
│   ├── month-layout.ts      # month grid model for one or many months
│   ├── time-grid-layout.ts  # day columns + time axis (no events)
│   ├── list-layout.ts       # agenda day list (no events)
│   └── mini-calendar.ts     # mini calendar model (in-range, marked days)
└── controllers/
    ├── calendar-controller.ts       # createCalendarController()
    └── mini-calendar-controller.ts  # createMiniCalendarController()
```

Imports: `calendar/*` uses only `foundation/*` in this stage (no `date/`/`time/` exist yet).
`check-domains.mjs` already enforces the folder rules (03 §4).

Foundation additions (allowed: each stage builds the foundation it needs, 02 §9):

| File | Addition | Reused by |
| --- | --- | --- |
| `foundation/a11y/roving-focus.ts` | `focusDateCell(container, date)` and `syncRovingTabIndex(container, focusedKey)`: DOM helpers that find `[data-chrono-key="…"]` and move focus/`tabindex`. Called only from lifecycle code | Date panels (stage 4) |
| `foundation/a11y/messages.ts` | New default messages: `previous`, `next`, `today`, `calendar`, `weekNumber`, `hasEvents` | — |
| `foundation/store/attributes.ts` | `type Attributes = Record<string, string \| number \| boolean \| undefined>` + `mergeAttributes()` | All controllers |

`data-chrono-key` holds the ISO date (`2026-11-17`) of a cell. It is how DOM helpers find
cells without framework refs.

### 2.2 View definitions

```ts
type ViewLayout = "month" | "time-grid" | "list";
type ViewDefinition = {
  id: string;
  layout: ViewLayout;
  length: { days?: number; weeks?: number; months?: number };  // exactly one
  align: "day" | "week" | "month" | "year";                     // where a range starts
  hiddenDays?: DayOfWeek[];
  months?: number;            // month layout only: how many month grids (multi-month)
  fixedWeeks?: boolean;       // month layout only
};
```

| Built-in `id` | layout | length | align | Notes |
| --- | --- | --- | --- | --- |
| `month` | month | 1 month | month | `fixedWeeks: true` by default |
| `week` | time-grid | 1 week | week | |
| `workWeek` | time-grid | 1 week | week | `hiddenDays` = locale weekend (C9) |
| `day` | time-grid | 1 day | day | |
| `agenda` | list | 7 days | day | Default decided (§12.2). Override with `views: { agenda: { length: { months: 1 } } }` |
| `multiMonth` | month | 3 months | month | `months: 3` |

Custom views: the `views` option merges app definitions with the built-ins
(`{ threeDay: { layout: "time-grid", length: { days: 3 }, align: "day" }, year: { layout:
"month", length: { months: 12 }, align: "year", months: 12 } }`). Unknown ids throw in
development and fall back to `month`.

`setRange(start, end)` covers BRD "custom date ranges": it switches to an ad-hoc `custom`
definition whose length is the range length, so `prev`/`next` move by that length.

### 2.3 Pure navigation (`navigation/*`)

| Function | Spec |
| --- | --- |
| `getRange(definition, anchor, ctx)` | Logical range from alignment + length. `ctx = { weekStartsOn }` |
| `getVisibleRange(definition, range, ctx)` | Adds adjacent days for month layouts (full weeks, `fixedWeeks`). Same as `range` for other layouts. Hidden days stay inside the range (they are hidden, not removed), so fetching is stable |
| `navigate(state, action, ctx)` | `action: "prev" \| "next" \| "today" \| { goTo: PlainDate } \| { view: string } \| { range: DateRange }`. Returns the next `{ view, anchor, focusedDate }`. Clamps to `min`/`max` (C10) |
| Focus on view change | Keep `focusedDate` if it is inside the new range. Otherwise use the new range's first visible, non-hidden day |
| `getCalendarTitle(range, definition, locale)` | `{ text, parts }` via `formatDateRange` / `formatDate`. Month: "November 2026". Week: "Nov 16 – 22, 2026". Day: "Tuesday, November 17, 2026". Multi-month: "Nov 2026 – Jan 2027". `parts` lets apps style pieces |

### 2.4 View models (`views/*`)

All pure, built on `foundation/grid`.

```ts
type CalendarDay = GridDay & {             // GridDay from 03 §3.5
  key: string;                             // ISO date, used as data-chrono-key
  inRange: boolean;                        // inside the logical range
  hidden: boolean;
  disabled: boolean;                       // outside min/max
  focused: boolean;
};
type MonthLayout = { kind: "month"; months: { year: number; month: number;
                     weeks: { weekNumber: number; days: CalendarDay[] }[] }[];
                     weekdays: WeekdayHeader[] };
type TimeGridLayout = { kind: "time-grid"; days: CalendarDay[];   // visible columns only
                        slots: TimeSlot[];                        // from getTimeAxis()
                        weekdays: WeekdayHeader[] };
type ListLayout = { kind: "list"; days: CalendarDay[] };
type CalendarLayout = MonthLayout | TimeGridLayout | ListLayout;
```

Time grid options: `timeGrid: { start = 00:00, end = 24:00, step = 30 min, workingHours?:
{ start, end, days? } }`. Stage 3 adds event positions on top of this model; the model shape
is designed so that stage 3 only adds fields.

Mini Calendar model: `getMiniCalendarLayout(month, { highlight?: DateRange, isMarked?:
(date) => boolean, … })` → one month grid where each day adds `highlighted` and `marked`.

### 2.5 Controllers

`createCalendarController(options)` — framework-free, built on `createStore` and
`createControllable` (03 §3.7).

```ts
type CalendarOptions = {
  view?: string; defaultView?: string; onViewChange?: (view: string) => void;
  date?: DateInput; defaultDate?: DateInput; onDateChange?: (date: PlainDate) => void;
  onVisibleRangeChange?: (range: DateRange, info: { view: string }) => void;
  onDateActivate?: (date: PlainDate, info: { view: string; source: "pointer" | "keyboard" }) => void;
  views?: Record<string, Omit<ViewDefinition, "id">>;
  locale?: string; weekStartsOn?: DayOfWeek; hiddenDays?: DayOfWeek[];
  timeZone?: string; now?: number;
  min?: DateInput; max?: DateInput;
  timeGrid?: { start?: TimeInput; end?: TimeInput; step?: number; workingHours?: … };
  weekNumbers?: "iso" | "locale" | false;
  messages?: Partial<CalendarMessages>;
};
type CalendarState = {
  view: string; definition: ViewDefinition;
  date: PlainDate; focusedDate: PlainDate; today: PlainDate;
  range: DateRange; visibleRange: DateRange;
  title: { text: string; parts: Intl.DateTimeFormatPart[] };
  layout: CalendarLayout;
  canGoPrev: boolean; canGoNext: boolean;
  direction: "ltr" | "rtl";
};
type CalendarController = {
  getState(): CalendarState;
  subscribe(listener: (state: CalendarState) => void): () => void;
  setOptions(options: Partial<CalendarOptions>): void;      // adapters push new props
  prev(): void; next(): void; today(): void;
  goTo(date: DateInput): void; setView(view: string): void; setRange(range: DateRange): void;
  focusDate(date: PlainDate): void;
  activateDate(date: PlainDate, source: "pointer" | "keyboard"): void;
  handleKeyDown(key: string, modifiers: { shift: boolean; ctrl: boolean; meta: boolean }): boolean;
  getRootAttributes(): Attributes;
  getTitleAttributes(): Attributes;
  getNavAttributes(kind: "prev" | "next" | "today"): Attributes;
  getViewButtonAttributes(view: string): Attributes;
  getGridAttributes(monthIndex?: number): Attributes;
  getColumnHeaderAttributes(day: CalendarDay | WeekdayHeader): Attributes;
  getCellAttributes(day: CalendarDay): Attributes;
  getSlotAttributes(slot: TimeSlot, day: CalendarDay): Attributes;
  destroy(): void;
};
```

Rules:
- `onVisibleRangeChange` fires once on creation (so apps load the first range) and then only
  when `visibleRange` really changes (compare with `isSameDay` on both ends).
- `handleKeyDown` returns `true` when it handled the key, so adapters call
  `preventDefault()` only then.
- Attribute getters return **plain records** (ARIA + `data-*` + `tabindex` +
  `data-chrono-key`). They never return event handlers. Each adapter attaches handlers in its
  own idiom.
- `setOptions` with equal values does not notify.

Attribute contract (shared by every adapter, tested for parity):

| Element | Attributes |
| --- | --- |
| Root | `data-chrono-calendar`, `data-view`, `data-layout`, `dir` |
| Title | `id`, `aria-live="polite"` |
| Prev / Next / Today | `aria-label` (messages), `aria-disabled` + `data-disabled` at bounds |
| View button | `aria-pressed`, `data-view` |
| Month grid | `role="grid"`, `aria-labelledby` (title), `aria-multiselectable` absent |
| Column header | `role="columnheader"`, `abbr` (long weekday), `data-weekend`, `data-today` (time grid) |
| Day cell (month) | `role="gridcell"`, `aria-label` (03 labels), `aria-current="date"` on today, `tabindex` (0 on focused, −1 otherwise), `data-chrono-key`, `data-today`, `data-outside-month`, `data-weekend`, `data-disabled`, `data-focused`, `data-hidden` |
| Week number | `role="rowheader"`, `aria-label` ("Week 47") |
| Time-grid slot | `data-slot-start`, `data-working-hours`. Not focusable in stage 2 (C7) |
| Agenda day | `role="listitem"` inside a `role="list"`, `data-chrono-key`, `data-today` |

`createMiniCalendarController(options)`:

```ts
type MiniCalendarOptions = {
  month?: { year: number; month: number }; defaultMonth?: …; onMonthChange?: …;
  syncWith?: { date: PlainDate; visibleRange: DateRange };   // C11
  isMarked?: (date: PlainDate) => boolean;                   // e.g. "has events"
  onNavigate?: (date: PlainDate) => void;                    // F2 output
  locale?; weekStartsOn?; timeZone?; now?; min?; max?; weekNumbers?; messages?;
};
```

State and attribute getters mirror the calendar's month layout. Extra cell attributes:
`data-in-range` (inside `syncWith.visibleRange`) and `data-marked` (+ `aria-label` suffix
from `messages.hasEvents`). Enter / click calls `onNavigate`.

`data-marked` is added to the shared `data-*` vocabulary (02 §4).

---

## 3. Adapters: the `/calendar` entry

Every adapter adds `src/calendar/` and the `./calendar` export, and the root entry gets
`export * from "./calendar/index.js"` (02 §2.7). Internal shared pieces (grid rendering used by
both `Calendar` and `MiniCalendar`) live in `src/calendar/internal/` and are not exported.

### 3.1 Parts (same names in React, Vue, Svelte)

| Part | Renders (default element) | Notes |
| --- | --- | --- |
| `Calendar` | `div` | Creates the controller, provides internal context. Props = `CalendarOptions` |
| `CalendarTitle` | `h2` | Title text, or `children(title)` for custom rendering |
| `CalendarPrevButton`, `CalendarNextButton`, `CalendarTodayButton` | `button` | |
| `CalendarViewButton` | `button` | `view` prop. Calls `setView` |
| `CalendarMonthGrid` | `table` | `month` index prop for multi-month. Renders head + body. Children / slot receives each `CalendarDay` |
| `CalendarWeekdayHeader` | `th` | |
| `CalendarWeekNumber` | `th` | Rendered only when `weekNumbers` is on |
| `CalendarCell` | `td` | Day cell. Handles click, keydown, focus |
| `CalendarTimeGrid` | `div` | Children receive `{ days, slots }` |
| `CalendarTimeGridColumnHeader` | `div` | Focusable day header row (C7) |
| `CalendarTimeGridSlot` | `div` | Not focusable in stage 2 |
| `CalendarAgenda`, `CalendarAgendaDay` | `ul`, `li` | |
| `MiniCalendar`, `MiniCalendarTitle`, `MiniCalendarPrevButton`, `MiniCalendarNextButton`, `MiniCalendarGrid`, `MiniCalendarWeekdayHeader`, `MiniCalendarCell` | as above | Props = `MiniCalendarOptions` |

No part renders a class, a `style` or any CSS of its own (02 §2.8). Every part accepts the
consumer's own attributes and class, merged after Chrono's
attributes for `class`/`style` and **before** them for ARIA/`data-*` (Chrono wins on the
contract attributes). React also supports `asChild` (Overlay's `Slot`, copied into
`src/shared/`).

### 3.2 Per framework

| Framework | Hook / controller | Binding |
| --- | --- | --- |
| React | `useCalendar(options)` → `{ state, actions, getRootProps(), getCellProps(day), … }` (prop getters add handlers to the core attribute records) | `useSyncExternalStore` on the controller. `setOptions` in a layout effect. Focus moves in `useLayoutEffect` only when focus was already inside the grid |
| Vue | `useCalendar(options)` with refs/getters → reactive `state` + prop getters | `shallowRef` updated from `subscribe`. Components are render functions. `v-model:view`, `v-model:date`. Scoped slots for cells |
| Svelte | `useCalendar(options)` in `.svelte.ts`, runes-based | `$state` mirrored from `subscribe`, `bind:view`, `bind:date`. Snippets for cells. An action (`use:calendarCell`) attaches handlers |
| Vanilla | `createCalendar(root, options)` | Controller-only (02 §6). The app renders markup from `state` (any templating). `createCalendar` adds **delegated** `click` / `keydown` / `focusin` listeners on `root`, finds targets via `data-chrono-key` and `data-chrono-action="prev\|next\|today\|view"`, and exports `applyAttributes(el, attrs)` so templates can stamp the attribute records. After each app render, `calendar.syncFocus()` restores focus and `tabindex` |

All adapters: no Provider (02 §2.5). SSR: nothing touches the DOM during render. With `now`
and `locale` passed, server and client render the same markup (tested, §5).

---

## 4. Entry points and the root/subpath test

- Core `package.json`: add `./calendar`. `bundle-core.mjs` rewrites it (01 §4.4).
- Adapter `package.json`: add `./calendar` (`types`, `import`, `default`; Svelte also
  `svelte`).
- `src/calendar/index.ts` exports: the parts (§3.1), `useCalendar` / `useMiniCalendar` (or
  `createCalendar` / `createMiniCalendar` in Vanilla), their option/state types, the
  view-definition types, and the depth-1 utilities apps need with Calendar (02 §4):
  `getCalendarTitle`, `getRange`, `getVisibleRange`, plus the value helpers Calendar props
  accept (`PlainDate`, `DateRange`, `toPlainDate`, `toIsoString`, `isSameDay`). Value helpers
  are **re-exported from core**, never redefined, so later `/date` re-exports of the same
  helpers are the same binding.
- New test in each adapter, `tests/entries.test.ts` (02 §8):
  - Root export names equal the union of the subpath export names (only `/calendar` today).
  - For every name, `root[name] === calendar[name]`.
  - Importing `dist/calendar/index.js` loads no file outside `dist/calendar/`,
    `dist/shared/` and vendored core `foundation/` + `calendar/` (uses the
    `check-domains.mjs` graph walker in reachability mode).

---
