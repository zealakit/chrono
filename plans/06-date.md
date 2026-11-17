# Plan: stage 4a — Date domain (`/date`)

Status: **proposal — not implemented**.

Order: **6 of N**. Runs after `05-event-layout.md` (`0.3.0` published). First of the three
stage-4 plans in `02-implement-business-flow.md` §9: **06 Date**, `07-time.md` Time (can run
in parallel, neither imports the other), then `08-datetime.md` DateTime (needs both).
Implements flows **F11** (DateInput), **F12** (DatePanel), **F13** (DateRangeInput /
DateRangePanel), **F14** (MultiDatePanel) and the Date part of **F19** (compose with an
external popup).

Goal: add the `/date` subpath to every adapter with five independent, composable,
unstyled components: `DateInput`, `DatePanel`, `DateRangeInput`, `DateRangePanel`,
`MultiDatePanel`. They work alone, together through a shared value, and inside any popup the
app chooses.

**Scope rule:**
- Date domain only. `/date` must not reach Calendar or Time code (02 §2.6, checked by
  `check-domains.mjs`).
- No popup, trigger, open state, positioning, portal or dismissal (02 §2.2, §2.8).
- No CSS, no visual inline styles (02 §2.8).
- Signatures below are **shapes** (TypeScript as spec, not code).

---

## 1. Decisions taken in this plan

| # | Topic | Decision | Why |
| --- | --- | --- | --- |
| A1 | Value types | `DateValue = PlainDate \| null`. `DateRangeValue = { start: PlainDate \| null; end: PlainDate \| null } \| null` (inclusive, 03 D9). `MultiDateValue = readonly PlainDate[]` (sorted, unique) | Partial ranges (`start` set, `end` null) are real states the Input must show while the user picks |
| A2 | Change vs commit | `onValueChange` fires on every value change (incl. a partial range). `onValueCommit` fires when a choice is **complete**: single = a day is picked; range = the end is picked and the range is valid; multi = never automatically, only when the app calls `commit()` | The app closes its popup on commit (02 §2.2). Multi selection has no natural end |
| A3 | Panel levels | Day / month / year levels for **navigation only** (title button: day → month → year; picking a month or year goes back down). `level` is controllable; `minLevel`/`maxLevel` limit it | Fast jumps across years (BRD §7.3 navigation). Month-only or year-only **values** are out of scope (§11) |
| A4 | Multi-month panels | `months: number` (default 1, `DateRangePanel` default 2). Paging moves by `pageBy: "month" \| "visible"` (default `"month"`) | Booking-style range pickers show two months |
| A5 | Range picking | Two picks. First pick sets `start` (partial value), hover or keyboard focus previews the range, second pick sets `end`. A second pick before `start` swaps (F13 auto-swap). Picking when a range is complete starts a new range. Escape while partial cancels the draft | The common booking flow, fully keyboard-reachable |
| A6 | Range limits while picking | After `start` is picked, days that cannot end a valid range (`minDays`, `maxDays`, unavailable or disabled days inside, per `allowUnavailableInside` / `allowDisabledInside`) get `data-range-blocked`. They stay focusable but cannot be picked | Users see the limit before they hit it. Uses `checkDateRange` (03 §3.3) |
| A7 | Multi picking | Click / Enter / Space toggles a day. Shift+click or Shift+Enter adds every selectable day between the last toggled day and this one. `maxSelected` caps the count (`data-range-blocked` on the rest when full) | F14. Same blocked-day signal as ranges |
| A8 | Focus on mount | `autoFocus` (default **false**). When true, the panel focuses its active cell on mount. Active cell = selected day → today if selectable → first selectable day of the visible month | Inline panels must not steal focus on page load. The F19 recipes set `autoFocus` (changes 02 F19 from "opt-out" to "opt-in", §12.2) |
| A9 | Panel follows value | When `value` changes from outside (e.g. typed in a `DateInput`) to a date outside the visible month(s), the panel shows that month (`followValue`, default `true`) | Input + Panel stay in sync with no glue code |
| A10 | Segments | Segmented mode (default, 02 §2.2a): one `role="spinbutton"` per part, in locale order from `getDatePartOrder()` (03 §3.2), separators as literal parts. Digits type in and auto-advance when the part cannot take another digit. ↑/↓ step (wrapping inside the part's range), PageUp/PageDown step by a larger amount (month 3, year 10), Backspace clears the part, ←/→ move between parts (swapped in RTL), Home/End go to the part's min/max | Same behavior as native date inputs and React Aria. No ambiguous parsing |
| A11 | Incomplete and invalid input | The Input keeps whatever was typed. `value` is `null` until all parts form a real date. A `validity` state reports `"empty" \| "incomplete" \| "invalid-date"` (e.g. 31 Feb) `\| "before-min" \| "after-max" \| "disabled" \| "unavailable" \| "valid"`. `aria-invalid` + `data-invalid` when not valid and not empty. Error text is the app's | F11: never throw away what the user typed. Apps show their own messages |
| A12 | Placeholders | Empty parts show placeholder text from `messages` (`dd`, `mm`, `yyyy`, English defaults, overridable) and `data-placeholder`. `placeholderValue` (a date) decides the starting value when the user presses ↑/↓ on an empty part (default: today) | `Intl` has no localized placeholder words (03 D13) |
| A13 | Text mode | `mode: "text"`: one native `<input type="text">` per date. Parsed on blur, Enter and paste. Accepts the locale's numeric order with any separators, month names (long/short, any case) from `getMonthNames()`, and ISO. Two-digit years resolve to the nearest year within ±50 years of today. Valid input is re-formatted on blur with `formatDate` (numeric). `parse` / `format` options replace the built-ins. Unparseable text stays as typed, `validity: "invalid-date"`, `onInvalidInput(text)` | 02 §2.2a. Fast entry and mobile-friendly |
| A14 | Range inputs | `DateRangeInput` = **two** date fields (start, end) inside one `role="group"`, in both modes. Each field reuses the `DateInput` controller | Accessible labels per field, no custom separator parsing (decided, §12.3) |
| A15 | Forms | `name` renders a hidden `<input type="hidden">` with the ISO value (`2026-11-17`; ranges: `name` + `name-start`/`name-end` style keys via `startName`/`endName`; multi: one hidden input per date). Form `reset` restores `defaultValue`. `required` sets `aria-required` and blocks `validity: "valid"` when empty | Works in plain HTML forms and server actions with no glue |
| A16 | Clear | `clear()` action on every controller. `DateInputClearButton` part. Panels have no built-in clear control (the app adds a button that calls `clear()`) | BRD "clearable selection" without forcing a UI |
| A17 | Read-only / disabled | `readOnly`: focusable, navigable, value cannot change. `disabled`: not focusable, `aria-disabled`, `data-disabled` on the root | BRD §7.3 states |
| A18 | Escape | Handled only to cancel a range draft or revert an in-progress text edit. Otherwise not handled and **not** stopped, so the app's popup can close on Escape | 02 §2.2: dismissal belongs to the popup library |
| A19 | Shared grid rendering | The month-grid rendering internals used by `MiniCalendar` (04) move from `src/calendar/internal/` to the adapter's `src/shared/grid/`, and both `/calendar` and `/date` use them | `shared/` is not a domain (02 §2.7), so this adds no Calendar ↔ Date dependency |
| A20 | Vanilla declarative init | `initDateElements(root = document)` (02 §6, §11.5) finds `[data-chrono-date-input]`, `[data-chrono-date-panel]`, `[data-chrono-date-range-input]`, `[data-chrono-date-range-panel]`, `[data-chrono-multi-date-panel]`, reads options from `data-*` (`data-min`, `data-max`, `data-locale`, `data-mode`, `data-name`, `data-months` …), renders unstyled markup inside, and dispatches `chrono:valuechange` / `chrono:valuecommit` DOM events. `data-chrono-for="<id>"` links a panel to an input so they share one value. Returns a cleanup function | Inputs and Panels are the declarative case (02 decision). Names are per domain so `/date` does not reach Time code |
| A21 | Range presets | Pure helpers `getPresetRange(preset, ctx)` for `today`, `yesterday`, `last7Days`, `last30Days`, `thisWeek`, `lastWeek`, `thisMonth`, `lastMonth`, `thisQuarter`, `lastQuarter`, `yearToDate`, `thisYear`, `lastYear`, and custom `{ unit: "day" \| "week" \| "month" \| "quarter" \| "year"; amount; align: "rolling" \| "calendar" }`. `ctx = { today, weekStartsOn, fiscalYearStartMonth }` (fiscal quarters and years). `matchPreset(value, presets, ctx)` returns the preset that equals the current value, for `aria-pressed` on the app's buttons. No component: preset buttons are the app's and just set the range value | Reporting, analytics, admin dashboards and order filtering (BRD §4.2, §2 "filtering by date ranges") |
| A22 | Display formats | `formatOptions` on every Date Input, a subset of `Intl.DateTimeFormatOptions`: `year: "numeric" \| "2-digit"`, `month: "numeric" \| "2-digit" \| "short" \| "long"`, `day: "numeric" \| "2-digit"`, `weekday: "short" \| "long"` (shown as a read-only literal). Part order, separators and **month-name segments** come from `formatToParts` with these options. A month-name segment accepts typing a name prefix and ↑/↓; `aria-valuetext` is the name. Text mode formats with the same options | BRD §7.5 "configurable date and time formats", still locale-correct |
| A23 | Dynamic range limits | `minDays` / `maxDays` also accept `(start: PlainDate) => number`, re-evaluated when the start changes (e.g. a 2-night minimum when check-in is on Friday or Saturday) | Common hotel and rental rule (BRD §4.2) |
| A24 | Today shortcut | `today()` action and a `DatePanelTodayButton` part on every panel: shows today's month; with `selectToday` it also picks today when selectable (single panel) | Standard picker affordance after long navigation |
| A25 | Month and year values | New value type `PlainYearMonth` (`{ year, month }`, added to `foundation/values`). New `/date` components: `MonthPanel` (pick a month, page by year), `MonthRangePanel` (e.g. Jan–Mar 2026, two picks like A5), `YearPanel` (pick a year, page by decade) and `MonthInput` (month + year segments or text, A22 formats). They reuse the panel levels (A3), selection machines, constraints (`min`/`max` as year-months, `isMonthDisabled`), the shared input engine (07 T16), change/commit, forms (`2026-11`) and `initDateElements` | Reporting periods, budgeting, subscriptions, card-expiry style fields (BRD §4.2). Moved forward from post-1.0 because reporting is a primary segment |

---

## 2. Core: `date/` (`@zealakit/chrono-core/date`)

### 2.1 Folders

```text
packages/core/src/date/
├── index.ts
├── selection/
│   ├── single.ts          # pick, clear, commit rules
│   ├── range.ts           # A5/A6: draft, preview, swap, blocked days, commit
│   └── multiple.ts        # A7: toggle, shift-add, max
├── panel/
│   ├── levels.ts          # A3: day/month/year level state and grids
│   ├── panel-model.ts     # visible months (A4), cell state, follow value (A9)
│   ├── panel-keyboard.ts  # grid keys per level (foundation nextFocusedDate) + selection keys
│   └── controllers.ts     # createDatePanelController / createDateRangePanelController /
│                          # createMultiDatePanelController
└── input/
    ├── parts.ts           # A10: day/month/year part definitions for the shared engine
    ├── parse.ts           # A13: date parsing rules on top of foundation/input/tokenize
    ├── validity.ts        # A11
    └── controllers.ts     # createDateInputController / createDateRangeInputController

packages/core/src/foundation/input/       # shared with Time (plan 07 T16)
├── segment-engine.ts      # generic typing / auto-advance / step / wrap / clear / paste machine
├── tokenize.ts            # generic text tokenizer (numbers, words, separators)
└── form.ts                # A15: hidden-input values, form reset (generic over value type)
```

The segment engine, tokenizer and form helpers are generic and live in `foundation/input/`
from the start, because Time needs the same machinery and cannot import Date (02 §2.6,
plan 07 T16). `date/input` only defines date parts and date parsing rules.

Imports: `date/*` → `foundation/*` only (02 §2.6). Foundation additions:

| File | Addition |
| --- | --- |
| `foundation/a11y/messages.ts` | `placeholderDay`, `placeholderMonth`, `placeholderYear`, `previousMonth`, `nextMonth`, `previousYear`, `nextYear`, `chooseMonth`, `chooseYear`, `clear`, `startDate`, `endDate`, `selectedCount` ("{count} dates selected") |
| `foundation/locale/format.ts` | `getDateFormatPattern(locale, messages)` → e.g. `dd/mm/yyyy` from part order + placeholder messages, for text-mode hints |

### 2.2 Panel controllers

```ts
type DatePanelOptions = {
  value?: DateValue; defaultValue?: DateValue; onValueChange?: (v: DateValue) => void;
  onValueCommit?: (v: PlainDate) => void;
  visibleMonth?: { year: number; month: number }; defaultVisibleMonth?: …;
  onVisibleMonthChange?: …;
  level?: "day" | "month" | "year"; defaultLevel?: …; onLevelChange?: …;
  minLevel?: …; maxLevel?: …;
  months?: number; pageBy?: "month" | "visible";
  followValue?: boolean; autoFocus?: boolean;
  min?: DateInput; max?: DateInput;
  isDateDisabled?: (d: PlainDate) => boolean; isDateUnavailable?: (d: PlainDate) => boolean;
  locale?; weekStartsOn?; timeZone?; now?; weekNumbers?: "iso" | "locale" | false;
  readOnly?: boolean; disabled?: boolean;
  messages?: Partial<DateMessages>;
};
type DateRangePanelOptions = Omit<DatePanelOptions, "value" | "defaultValue" | "onValueChange" | "onValueCommit"> & {
  value?: DateRangeValue; defaultValue?: …; onValueChange?: …;
  onValueCommit?: (v: { start: PlainDate; end: PlainDate }) => void;
  onRangePreviewChange?: (preview: { start: PlainDate; end: PlainDate } | null) => void;
  onInvalidRange?: (reason: RangeInvalidReason) => void;
  minDays?: number; maxDays?: number;
  allowUnavailableInside?: boolean; allowDisabledInside?: boolean;
};
type MultiDatePanelOptions = Omit<DatePanelOptions, …> & {
  value?: MultiDateValue; defaultValue?: …; onValueChange?: …;
  onValueCommit?: (v: MultiDateValue) => void; maxSelected?: number;   // count limit
};
```

`min`/`max` are always dates in Chrono, so the multi count limit is named `maxSelected`.

State: `value`, `draft` (range), `preview` (range), `visibleMonths`, `level`, `focusedDate`,
`today`, `layout` (per level: day grids from `foundation/grid`, month grid, year grid),
`canGoPrev`, `canGoNext`, `title` (`{ text, parts }`), `direction`.

Actions: `pick(date, source)`, `toggle(date)`, `extendTo(date)` (multi shift-add),
`setPreview(date | null)`, `cancelDraft()`, `clear()`, `commit()`, `prev()`, `next()`,
`setLevel(level)`, `focusDate(date)`, `handleKeyDown(key, modifiers)`, `mount(root)` /
`unmount()` (autoFocus, focus sync).

Attribute contract (shared by all adapters; parity-tested):

| Element | Attributes |
| --- | --- |
| Root | `role="group"`, `aria-label` / `aria-labelledby` (app), `data-chrono-date-panel` (`range` / `multi` value for the other two), `data-level`, `data-disabled`, `data-readonly`, `dir` |
| Title | `id`, `aria-live="polite"` |
| Level button (title) | `aria-label` (messages `chooseMonth` / `chooseYear`), `data-level` |
| Prev / Next | `aria-label`, `aria-disabled` + `data-disabled` at bounds |
| Grid | `role="grid"`, `aria-labelledby`, `aria-multiselectable` (`true` for range and multi), `aria-readonly` |
| Weekday header | `role="columnheader"`, `abbr` |
| Day cell | `role="gridcell"`, `aria-selected`, `aria-disabled` (disabled, unavailable or blocked), `aria-current="date"` on today, `aria-label` (03 labels incl. status words), `tabindex`, `data-chrono-key`, `data-selected`, `data-today`, `data-outside-month`, `data-weekend`, `data-disabled`, `data-unavailable`, `data-focused`, `data-range-start`, `data-range-end`, `data-in-range`, `data-range-preview`, `data-range-blocked` |
| Month / year cell | Same shape with `data-chrono-key` = `2026-11` / `2026` |

`data-range-blocked` is added to the shared vocabulary (02 §4).

Keyboard (day level; month and year levels use the same keys over their own grids, 03 §3.6):

| Key | Single | Range | Multi |
| --- | --- | --- | --- |
| Arrows, Home/End, PageUp/PageDown (+Shift) | Move focus | Move focus (updates preview while a draft exists) | Move focus |
| Enter / Space | Pick + commit | First → start; second → end + commit | Toggle |
| Shift+Enter / Shift+Space | — | — | Add range from the last toggled day |
| Escape | Not handled (A18) | Cancel draft if any, else not handled | Not handled |
| Ctrl/Cmd+↑ (day level) | Go up a level | same | same |

### 2.3 Input controllers

```ts
type DateInputOptions = {
  value?: DateValue; defaultValue?: DateValue; onValueChange?: (v: DateValue) => void;
  onValueCommit?: (v: PlainDate) => void;            // on blur/Enter with a valid value
  mode?: "segmented" | "text";                        // default "segmented"
  placeholderValue?: DateInput;                       // A12
  parse?: (text: string, ctx: ParseContext) => PlainDate | null;   // text mode, A13
  format?: (date: PlainDate, ctx: FormatContext) => string;
  onInvalidInput?: (text: string) => void;
  name?: string; required?: boolean; readOnly?: boolean; disabled?: boolean;
  min?; max?; isDateDisabled?; isDateUnavailable?;
  locale?; timeZone?; now?; messages?;
};
type DateRangeInputOptions = Omit<DateInputOptions, "value" | …> & {
  value?: DateRangeValue; defaultValue?: …; onValueChange?: …; onValueCommit?: …;
  startName?: string; endName?: string;
  minDays?: number; maxDays?: number; allowUnavailableInside?; allowDisabledInside?;
};
```

State: `segments` (per part: `type`, `value`, `text`, `placeholder`, `min`, `max`, `editable`)
or `text` (text mode), `value`, `validity`, `focusedPart`. Range: `start` and `end` sub-states +
range validity reasons from `checkDateRange`.

Segment attributes: `role="spinbutton"`, `aria-label` (part name from `Intl.DisplayNames`
`dateTimeField` when available, else messages), `aria-valuenow`, `aria-valuemin`,
`aria-valuemax`, `aria-valuetext` (formatted, or "Empty"), `tabindex` (0 on the first editable
part only, the rest −1; the group is one tab stop with ←/→ between parts), `inputmode="numeric"`,
`contenteditable` is **not** used (keyboard handled directly; mobile uses a hidden native
`<input inputmode="numeric">` per segment only if testing on iOS Safari shows it is needed —
decided in PR 4), `data-placeholder`, `data-invalid`, `data-chrono-part`.

Text field attributes: native `<input type="text">`, `aria-invalid`, `aria-describedby` (app),
`autocomplete="off"`, `spellcheck="false"`, `data-invalid`.

Parser (`parse.ts`): tokenizes into numbers and words, maps them by the locale part order,
accepts month names, handles 2-digit years (A13), rejects impossible dates, returns
`{ date } | { error: "unparseable" | "invalid-date" }`. Locales tested in §5.

---

## 3. Adapters: the `/date` entry

### 3.1 Parts (same names in React, Vue, Svelte)

| Part | Default element | Notes |
| --- | --- | --- |
| `DateInput` | `div` | Root (`role="group"`). Props = `DateInputOptions` |
| `DateInputSegment` | `span` | One part. Children/slot receive the segment for custom text |
| `DateInputLiteral` | `span` | Separator, `aria-hidden="true"` |
| `DateInputTextField` | `input` | Text mode field |
| `DateInputClearButton` | `button` | A16 |
| `DateRangeInput` | `div` | Root (`role="group"`) |
| `DateRangeInputStart`, `DateRangeInputEnd` | `div` | Each provides a `DateInput` context, so `DateInputSegment` / `DateInputTextField` work inside (A14) |
| `DatePanel`, `DateRangePanel`, `MultiDatePanel` | `div` | The three roots |
| `DatePanelTitle`, `DatePanelLevelButton`, `DatePanelPrevButton`, `DatePanelNextButton` | `h2`, `button`, `button`, `button` | Work under any of the three panel roots |
| `DatePanelGrid` | `table` | `month` index prop for multi-month. Renders the active level's grid |
| `DatePanelWeekdayHeader`, `DatePanelWeekNumber`, `DatePanelCell` | `th`, `th`, `td` | `DatePanelCell` children/slot receive the cell for custom presentation (BRD "custom date presentation") |
| `DatePanelTodayButton` | `button` | A24. Works under any panel root |
| `MonthPanel`, `MonthRangePanel`, `YearPanel` | `div` | A25 roots. Use `DatePanelTitle`, `DatePanelPrevButton`, `DatePanelNextButton`, `DatePanelGrid`, `DatePanelCell` inside (the grid shows months or years) |
| `MonthInput` | `div` | A25. Uses `DateInputSegment`, `DateInputLiteral`, `DateInputTextField`, `DateInputClearButton` inside |

Hidden form inputs (A15) are rendered by the roots when `name` is set; no separate part.

Hooks / controllers: React and Vue `useDateInput`, `useDateRangeInput`, `useDatePanel`,
`useDateRangePanel`, `useMultiDatePanel`; Svelte same names (runes); Vanilla
`createDateInput(el, opts)`, `createDateRangeInput`, `createDatePanel`, `createDateRangePanel`,
`createMultiDatePanel`, plus `initDateElements()` (A20).

Bindings follow plan 04 §3.2 (`useSyncExternalStore`, `shallowRef`, runes; `v-model` /
`bind:value`; no Provider; no CSS; `asChild` in React).

### 3.2 Entry points

- Core `package.json`: `./date`. Adapter `package.json`: `./date`. Root entries add
  `export * from "./date/index.js"` (02 §2.7).
- `src/date/index.ts` exports the parts, hooks/controllers, option/state/value types, and the
  depth-1 utilities the Date scope names (02 §4, BRD patch §3): `isDateSelectable`,
  `getDateStatus`, `checkDateRange`, `createAvailability`, `normalizeDateRange`,
  `isDateInRange`, `dateRangeLength`, `compare`, `isSameDay`, `toPlainDate`, `toIsoString`,
  `formatDate`, `parseDate` (A13 parser as a utility), `getPresetRange`, `matchPreset` (A21),
  `PlainYearMonth` helpers (`toPlainYearMonth`, `compareYearMonth`). Values re-exported from core, so
  `/calendar` and `/date` share bindings and the root has no conflicts.
- `entries.test.ts` (04 §4) now checks two subpaths. Reachability: `dist/date/index.js` must
  not reach `dist/calendar/`, `dist/time/`, or core `calendar/` / `time/`.

---

## 4. Integration recipes (F19, Date part)

Example apps per 02 §2.8, each installing its library in its own `package.json`. None of these
libraries appears in any Chrono package (enforced by `check:deps`).

| Example app | Library (installed by the example) | Recipe |
| --- | --- | --- |
| `examples/react-overlay` | `@zealakit/overlay-react` | `DateInput` + `DatePanel` in a Popover; close on `onValueCommit`; booking `DateRangeInput` + 2-month `DateRangePanel` |
| `examples/react-radix` | Radix Popover | Same two recipes |
| `examples/react-base-ui` | Base UI Popover | Same two recipes |
| `examples/vue-overlay` | `@zealakit/overlay-vue` | Same two recipes |
| `examples/svelte-overlay` | `@zealakit/overlay-svelte` | Same two recipes |
| `examples/vanilla` (existing) | none: native `<dialog>` | `initDateElements()` declarative recipe + `data-chrono-for` |

Each recipe sets `autoFocus` on the panel (A8), lets the popup library trap and return focus,
and does not handle Escape itself (A18). The existing framework examples also get an **inline**
`DatePanel` (no popup), a `MultiDatePanel`, both input modes, and a form submit showing the
hidden inputs (A15). Library versions are pinned when each example is created.

---

## 5. Tests

Core (four `TZ` zones):

| File | Proves |
| --- | --- |
| `date/selection/*.test.ts` | Single pick/clear/commit; range draft, preview, swap, cancel, restart, commit only when valid, every `checkDateRange` reason; multi toggle, shift-add skipping non-selectable days, `maxSelected`, dedupe/sort |
| `date/panel/levels.test.ts` | Level changes, min/max levels, month/year grids, picking a month returns to day level in that month |
| `date/panel/panel-model.test.ts` | `months`, `pageBy`, `followValue`, active-cell choice (A8), blocked days (A6) |
| `date/panel/panel-keyboard.test.ts` | Key table §2.2 per variant, RTL, Escape handled only with a draft |
| `date/input/parts.test.ts` | Typing and auto-advance per part (on the shared engine) for `en-US`, `en-GB`, `vi-VN`, `zh-CN`, `de-DE`; step and wrap; Backspace; PageUp/Down; placeholder start value; paste |
| `date/input/parse.test.ts` | Table of inputs per locale: separators (`/ . - space`), month names, ISO, 2-digit years at the ±50 boundary, invalid dates, garbage |
| `date/input/validity.test.ts` | Every validity state; `required` |
| `foundation/input/form.test.ts` | Hidden values for single, range, multi; reset to `defaultValue` |

Adapters (React, Vue, Svelte, Vanilla):

| File | Proves |
| --- | --- |
| `date-input.test.ts` | Both modes, typing, validity attributes, clear button, read-only/disabled, hidden input, form reset |
| `date-range-input.test.ts` | Two fields, shared range validity, names |
| `date-panel.test.ts` | Picking, levels, navigation, `autoFocus` on/off, custom cell content |
| `date-range-panel.test.ts` | Two months, preview on hover and focus, blocked days, commit timing |
| `multi-date-panel.test.ts` | Toggle, shift-add, `maxSelected` |
| `month-year.test.ts` | `MonthPanel`, `MonthRangePanel`, `YearPanel`, `MonthInput`: picking, paging, constraints, forms, keyboard (A25) |
| `presets.test.ts` (core) | Every preset for all 7 week starts, fiscal year starts 1/4/7/10, month and year ends, leap years; `matchPreset` (A21) |
| `date-compose.test.ts` | `DateInput` + `DatePanel` sharing a controlled value: typing moves the panel (A9), picking fills the input, commit fires once |
| `date-escape.test.ts` | Escape not stopped when nothing to cancel (a parent listener receives it), stopped only when cancelling a draft |
| `parity.test.ts` (extend) | Date scenarios in the shared fixture, identical snapshots |
| `ssr.test.ts` (extend) | Server render = client first render with `now` + `locale`; no focus or DOM work on the server |
| `no-styles.test.ts` (extend) | No `style`/class from Chrono on any Date part |
| `declarative.test.ts` (Vanilla only) | `initDateElements` options from `data-*`, DOM events, `data-chrono-for` linking, cleanup |

Manual a11y: VoiceOver + NVDA on the React inline panel, segmented and text inputs, and the
`react-overlay` recipe (focus into the panel, return on close).

---

## 6. Size budgets

Add to `size-budgets.json` (ceilings; budgets = measured +15 %, 04 §6):

| Entry | Ceiling (gzip) |
| --- | --- |
| `core/date` | 12 KB |
| `<adapter>/date` (incl. reached core) | 31 KB (incl. A21–A25) |
| `<adapter>/root` | sum of the subpath ceilings shipped so far |

---

## 7. Docs and agent files

- Adapter READMEs (EN/VI/CN): Date section — the five components, composition with a shared
  value, change vs commit (A2), both input modes, form integration, keyboard tables, the F19
  recipes as text (with links to the example apps), and the reminder that popups belong to
  the app.
- Root README: list `/date`; show both import styles with Date components.
- `skills/chrono-*.md`: "build a date picker with your own popup" steps.
- `.agents/AGENTS.md` + skill: `/date` shipped; A18 Escape rule and A19 shared-grid rule as
  hard boundaries.

---

## 8. Delivery (PR breakdown)

| PR | Content |
| --- | --- |
| 1 | Core `date/selection` + tests |
| 2 | Core `date/panel` (levels, model, keyboard, controllers) + attribute contract + tests |
| 3 | Core `foundation/input` (engine, tokenizer, form) + `date/input` (parts, parse, validity, controllers) + tests; `./date` core export |
| 4 | React `/date` (+ A19 move of grid internals to `src/shared/grid/`); decide the iOS segment input question (§2.3) |
| 5 | Vue `/date` |
| 6 | Svelte `/date` |
| 7 | Vanilla `/date` + `initDateElements` + parity complete |
| 8 | A21–A25 (presets, formats, dynamic limits, today, month/year components) in core and all adapters |
| 9 | Integration example apps (§4), existing examples (incl. a **reporting filter**: `DateRangeInput` + preset buttons + `MonthRangePanel`), docs, size budgets |

PRs 5–7 can run in parallel after PR 4 (PR 4 sets the shared-grid move the others follow).
**Release — prerelease `0.4.0-next.0` (decided, §12.1):** after PR 8 is merged to `main`:

1. Version every package to `0.4.0-next.0` (lockstep; core stays private).
2. `scripts/npm-publish.ts` learns prereleases: a version with a `-` suffix is published with
   `--tag next` and **never** `latest`; the script refuses to publish a prerelease without a tag
   and refuses `next` for a plain version. Added with a unit test in PR 8.
3. `pnpm release:check` and `pnpm npm:publish:check` pass, tarballs inspected (04 §10).
4. The **maintainer** runs the publish (agents never do, 04 C15) and tags `v0.4.0-next.0`.
   GitHub release marked "pre-release", listing `/date` and saying Time and DateTime are
   coming.
5. Smoke test: a fresh project installs `@zealakit/chrono-react@next` and builds with root and
   `/date` imports (same for Vue, Svelte, Vanilla). `npm view @zealakit/chrono-react dist-tags`
   still shows `latest` = `0.3.0`.

Plan 07 publishes `0.4.0-next.1` the same way. Plan 08 publishes the final `0.4.0` as
`latest`.

---

## 9. Definition of done

- `pnpm build`, `typecheck`, `test`, `lint`, `check:deps`, `check:domains`, `check:size`,
  `readme:check`, `pack:packages` exit 0. All examples build, including the integration apps
  (built separately, 02 §2.8).
- F11–F14 and the Date part of F19 covered by core and adapter tests.
- Parity snapshots identical across adapters.
- `/date` reaches no Calendar or Time code (reachability check).
- Manual screen-reader check recorded.

---

## 10. Changes to earlier plans

- 02 F19: panel focus on mount is **opt-in** (`autoFocus`, A8) instead of opt-out (decided,
  §12.2; 02 updated).
- 02 §4: vocabulary gains `data-range-blocked`; `data-placeholder` and `data-chrono-part` are
  now used.
- 04: grid rendering internals move to `src/shared/grid/` (A19). No behavior change.

---

## 11. Out of scope

- Popups, triggers, dismissal, positioning (02 §2.2, §2.8).
- Time and DateTime (`07-time.md`, `08-datetime.md`).
- Non-Gregorian calendars (02 §2.1).
- Ready-made Input + Panel field (02 §2.2: examples only for v1).

---

## 12. Open questions

1. ~~**Release timing**~~ — **decided: prerelease early.** `0.4.0-next.0` on the `next` dist-tag
   after this plan, `0.4.0-next.1` after 07, final `0.4.0` (`latest`) after 08 (§8 Release).
2. ~~**Panel `autoFocus` default**~~ — **decided: `false`.** Focus on mount is opt-in; the F19
   recipes turn it on (A8). 02 F19 updated.
3. ~~**Text-mode range input**~~ — **decided: two fields** (start, end) in both modes, each
   with its own label (A14). No combined range parser.

All open questions are decided.
