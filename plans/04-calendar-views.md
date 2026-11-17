# Plan: stage 2 — Calendar views and navigation (`/calendar`)

Status: **proposal — not implemented**.

Order: **4 of N**. Runs after `03-foundation.md` (foundation green, `0.1.0`). Implements
stage 2 of `02-implement-business-flow.md` §9: flows **F1** (navigate a calendar) and **F2**
(Mini Calendar). The next plan is `05-event-layout.md` (stage 3).

Goal: the first user-facing release. Every adapter gets the `/calendar` subpath and its root
re-export, with headless month, week, work week, day, agenda, multi-month and custom views,
navigation, headers and a Mini Calendar. **No events yet.** Views show the empty structure
that stage 3 fills with events.

**Scope rule:**
- Calendar domain only. No `date/`, `time/`, `datetime/` folders or entries.
- Views render days, weeks, time slots and headers. Event layout, the now-indicator, slot
  selection and the live clock belong to stage 3 (F3–F6).
- Signatures below are **shapes** (TypeScript types as spec, not code). Names are final
  unless a PR review finds a collision.

---

## 1. Decisions taken in this plan

| # | Topic | Decision | Why |
| --- | --- | --- | --- |
| C1 | Component naming | Flat named exports, prefixed by component: `Calendar`, `CalendarGrid`, `CalendarCell`, `MiniCalendar`, `MiniCalendarCell` … Same names in React, Vue and Svelte | Same style as Overlay (`Popover`, `PopoverTrigger`). Tree-shakes per part. Prefixes keep root re-exports free of collisions with Date (`DatePanelCell`) later |
| C2 | Hook / controller naming | Core: `createCalendarController`, `createMiniCalendarController`. Vanilla: `createCalendar`, `createMiniCalendar`. React and Vue: `useCalendar`, `useMiniCalendar`. Svelte: `useCalendar` / `useMiniCalendar` (runes-based) | One name per concept per framework. The `Controller` suffix keeps core names distinct from the Vanilla factories they back |
| C3 | Views are data | Every view, built-in or custom, is a `ViewDefinition` (length, alignment, layout, hidden days). Built-ins are just predefined definitions | One navigation engine. Custom views (3-day, 2-week, year overview) need no special code |
| C4 | Two ranges | `range` = the logical period (e.g. Nov 1–30). `visibleRange` = what is on screen (e.g. Oct 26 – Dec 6 with adjacent days). `onVisibleRangeChange` reports `visibleRange` | Apps fetch events for everything on screen, while titles describe the logical period |
| C5 | Focus model | Internal `focusedDate` drives roving `tabindex`. When keyboard focus leaves the current `range`, the calendar navigates (`onDateChange`). `focusedDate` is not a public controlled prop in v1 | Matches APG grid behavior. Fewer props. Can be made controllable later without breaking changes |
| C6 | Click behavior | Clicking or pressing Enter on a day fires `onDateActivate(date, { view, source })` and does nothing else. The app decides (e.g. switch to day view) | Calendar is not a date picker (patch §2). Activating a day has no fixed meaning in a scheduler |
| C7 | Keyboard in time grids | Stage 2: day column headers are the focusable row (←/→, Home/End, PageUp/PageDown = previous/next range). Time slots become focusable in stage 3 with slot selection (F6; plan 05 E13) | Nothing in an empty time grid is actionable yet. Avoids shipping a slot focus model that stage 3 would have to change |
| C8 | "Today" | Computed from `now` (option) + `timeZone` at creation and on every option update. No timer in stage 2 | The live clock (midnight rollover, now-indicator) ships with F4 in stage 3. SSR stays deterministic |
| C9 | Hidden days | `hiddenDays` applies to every grid layout. `workWeek` defaults to the locale's weekend from `getWeekInfo()` | Outlook-style "hide weekends" in month view comes for free |
| C10 | Min/max | `min`/`max` limit navigation: `prev`/`next` stop at the bound, nav buttons get `aria-disabled` + `data-disabled`. Days outside are still rendered and marked `data-disabled` | A calendar should not scroll into years the app does not support |
| C11 | Mini Calendar month | Own visible month. With `syncWith` (main calendar's `date` + `visibleRange`), it follows the main calendar when the main range leaves its month. The user can still page the Mini Calendar on its own | Outlook behavior. Keeps the two decoupled when the app wants that |
| C12 | Title announcements | The title element has `aria-live="polite"`, so navigation is announced. No separate live-region announcer yet (03 §3.6) | APG date-grid pattern. The announcer arrives with stage 3 |
| C13 | React Server Components | Every React entry file and component file starts with `"use client"` (root entry, `/calendar` entry, components). Pure helpers re-exported from core stay server-safe | Same as Overlay. Works in the Next.js App Router |
| C14 | Size gate | Stage 1 sizes were report-only (03 §11.2). From this stage on, `scripts/check-size.mjs` **fails the build** when an entry exceeds its budget (§6) | Decided in 03: the gate starts once real numbers exist |
| C15 | First npm release | **Publish `0.2.0` by hand** after this stage (decided). The maintainer runs the publish; agents never run it. npm dist-tag `latest`. READMEs say "pre-1.0: the API may change between minor versions". Every later stage release (0.3.0, 0.4.0, 0.5.0) is published the same way until stage 6 automates it | Early feedback from real users. Pre-1.0 semver already allows API changes |

---

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

## 5. Tests

Core (runs under the four `TZ` zones, 03 §5):

| File | Proves |
| --- | --- |
| `calendar/view-definition.test.ts` | Built-ins, custom merge, unknown id fallback, `setRange` ad-hoc view |
| `calendar/range.test.ts` | Range + visible range for every built-in × all 7 `weekStartsOn` × month ends (Jan 31, Feb 28/29, Dec 31), year alignment, hidden days |
| `calendar/navigate.test.ts` | prev/next/today/goTo/setView/setRange, min/max clamping, focus kept or moved on view change, multi-month paging by `length` |
| `calendar/title.test.ts` | Titles for every layout in `en-US`, `vi-VN`, `zh-CN`, `ar-EG`, across month and year boundaries |
| `calendar/layouts.test.ts` | Month (incl. multi-month, `fixedWeeks`, week numbers), time grid (step, working hours, hidden days), list |
| `calendar/controller.test.ts` | Controlled vs uncontrolled `view`/`date`, `onVisibleRangeChange` fires once at start and only on real change, `setOptions` with equal values does not notify, keyboard map incl. RTL, `onDateActivate` |
| `calendar/mini-calendar.test.ts` | Sync with main range (C11), own paging, marked days, `onNavigate` |
| `calendar/attributes.test.ts` | Attribute records for every element in §2.5. No record contains `style` or `class` (02 §2.8) |
| `bench.test.ts` (extend) | Controller update (next month) < 2 ms. Report only |

Adapters (each of react, vue, svelte, vanilla):

| File | Proves |
| --- | --- |
| `calendar.test.ts` | Renders each view, nav buttons, view buttons, controlled/uncontrolled, no Provider |
| `calendar-keyboard.test.ts` | Arrow/Home/End/Page keys move focus and `tabindex`, navigation when leaving the range, Enter → `onDateActivate` |
| `mini-calendar.test.ts` | Sync, marked days, `onNavigate` |
| `parity.test.ts` | Runs the shared scenarios from `tests/fixtures/calendar-parity.json` (repo root, read-only data) and compares normalized `data-*` / ARIA snapshots. All four adapters must produce identical snapshots |
| `ssr.test.ts` (React, Vue, Svelte) | Server render with `now` + `locale` equals the client's first render |
| `entries.test.ts` | §4 |
| `no-styles.test.ts` | Rendered markup of every part has no `style` attribute and no class the consumer did not pass. `dist` contains no `.css` and no CSS import (02 §2.8) |

Manual a11y check (02 §7): VoiceOver (Safari) and NVDA (Firefox) on the React example —
grid navigation, title announcements, disabled bounds. Results go in the PR description.

---

## 6. Size gate (`scripts/check-size.mjs`)

- Walks the import graph from each entry in `dist` (reuses the `check-domains.mjs` walker),
  concatenates the reachable files, gzips with `node:zlib`, compares to a budget.
- Budgets live in `size-budgets.json` at the repo root, per entry:
  `core/foundation`, `core/calendar`, and for each adapter `root` and `calendar` (adapter code
  + vendored core actually reached).
- First values: measured size **+15 %**, rounded up to the next 0.5 KB, with these ceilings
  (if a measurement is above its ceiling, the PR must shrink code, not raise the ceiling):

  | Entry | Ceiling (gzip) |
  | --- | --- |
  | `core/foundation` | 10 KB (03 §6) |
  | `core/calendar` | 6 KB |
  | `<adapter>/calendar` (incl. reached core) | 20 KB |

- Wired into `pnpm check` and `pnpm release:check`. The monitor shows the same numbers.
- Raising a budget needs a line in the PR description saying why.

---

## 7. Examples

Each framework example (`examples/{vanilla,react,vue,svelte,nextjs}`) becomes an
"Outlook-like shell" with plain CSS:

- Toolbar: prev / today / next, title, view buttons (month, week, work week, day, agenda,
  3-day custom view).
- Sidebar: `MiniCalendar` synced with the main calendar, a few `isMarked` days from static data.
- Main area: the active view, no events (a note says events arrive in 0.3.0).
- All CSS belongs to the example app (`src/styles.css`). The example shows that the same
  components look completely different by swapping that file. No Chrono package ships or
  imports CSS (02 §2.8).
- No third-party UI library in these examples. Integration example apps
  (`examples/<framework>-<library>`, 02 §2.8) start in stage 4 with the Input + Panel recipes.
- Shows **both import styles**: root import in one file, `/calendar` import in another
  (02 §2.7).
- Next.js: server-rendered page passing `now` and `locale` from the server (SSR proof).

---

## 8. Docs and agent files

- Adapter READMEs (EN/VI/CN): first real API section — install, both import styles, parts
  table, options table, attribute contract table, keyboard table, SSR note (`now`, `locale`),
  RSC note (React). readme-system rules apply; `pnpm readme:check` must pass.
- Root README: packages table moves from "in development" to "0.2.0 — Calendar views"; add a
  short "what is available" list (Calendar only).
- `skills/chrono-{vanilla,react,vue,svelte}.md`: Calendar integration steps.
- `.agents/AGENTS.md` + skill: scope line updated to "Calendar views shipped (stage 2)",
  `pnpm check:size` in Commands, the size-budget rule in Hard boundaries.
- Core README: `calendar/` module map.

---

## 9. Delivery (PR breakdown)

| PR | Content |
| --- | --- |
| 1 | Core `calendar/navigation` + `views` (pure) + tests. Foundation additions (§2.1) |
| 2 | Core controllers + attribute contract + tests. `./calendar` core export |
| 3 | `check-size.mjs` + `size-budgets.json` + `entries.test.ts` scaffolding |
| 4 | React `/calendar` + tests |
| 5 | Vue `/calendar` + tests |
| 6 | Svelte `/calendar` + tests |
| 7 | Vanilla `/calendar` + tests, parity fixture complete across all four |
| 8 | Examples, READMEs (EN/VI/CN), skills, agent files. Version `0.2.0` on all packages |
| Release | After PR 8 is merged to `main`: `pnpm release:check` and `pnpm npm:publish:check` pass, the tarballs are inspected (§10), then the **maintainer** runs `pnpm npm:publish:all` (four adapters; core is never published), and tags `v0.2.0`. A GitHub release lists what 0.2.0 contains and what is missing (events, pickers) |

PRs 4–7 can run in parallel after PR 3 (separate packages, no shared files except the parity
fixture, which PR 2 creates and PRs 4–7 only read).

---

## 10. Definition of done

- `pnpm build`, `typecheck`, `test`, `lint`, `check:deps`, `check:domains`, `check:size`, `readme:check`,
  `pack:packages` exit 0. All examples build, including Next.js SSR.
- F1 and F2 acceptance (02 §5) covered by core and adapter tests.
- Parity snapshots identical across the four adapters.
- Manual screen-reader check recorded.
- Packed tarballs contain `dist/calendar/` and `dist/vendor/core/{foundation,calendar}/` and no
  `@zealakit/chrono-core` dependency.
- After publishing: a fresh project installs `@zealakit/chrono-react@0.2.0` from npm and
  builds with both import styles (root and `/calendar`). Same smoke check for Vue, Svelte and
  Vanilla. `@zealakit/chrono-core` is not on npm.

---

## 11. Out of scope (later stages)

- Events of any kind, overflow, now-indicator, live clock, slot focus and selection (stage 3).
- Live-region announcer (stage 3).
- Drag, resize, resources, timeline, availability backgrounds, recurrence (stage 5).
- `/date`, `/time`, `/datetime` entries (stage 4). Month/year picker UI inside the calendar
  header is the app's (it can use `goTo`).
- Release **automation** (CI publishing, changesets, provenance) — stage 6. Publishing itself
  is manual from 0.2.0 (C15).

---

## 12. Open questions

1. ~~**Publish 0.2.0 to npm?**~~ — **decided: publish 0.2.0 by hand** after this stage, then each
   stage release the same way until stage 6 automation (C15, §9 Release).
2. ~~**Agenda default length**~~ — **decided: 7 days**, starting on the anchor date.
   Apps change it through `views` (§2.2).

All open questions are decided.
