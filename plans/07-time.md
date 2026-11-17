# Plan: stage 4b — Time domain (`/time`)

Status: **proposal — not implemented**.

Order: **7 of N**. Second stage-4 plan in `02-implement-business-flow.md` §9. It can run in
parallel with `06-date.md`, because Time never imports Date (02 §2.6). `08-datetime.md` needs
both. Implements flows **F15** (TimeInput, TimePanel, time slots), **F16** (TimeRangeInput,
TimeRangePanel) and the Time part of **F19** (compose with an external popup).

Goal: add the `/time` subpath to every adapter with `TimeInput`, `TimePanel`,
`TimeRangeInput` and `TimeRangePanel`. They work with **no date at all**: opening hours,
working hours, daily schedules, appointment slots (BRD patch §4).

**Scope rule:**
- Time domain only. `/time` must not reach Date or Calendar code (checked by
  `check-domains.mjs`).
- No date, no time zone in values. A time is a wall-clock time of an unspecified day.
- No popup, trigger, positioning or dismissal; no CSS (02 §2.2, §2.8).
- Same conventions as plan 06 wherever the problem is the same (change vs commit, forms,
  clear, read-only/disabled, Escape, autoFocus off, vanilla declarative init). This plan only
  restates them where Time differs.
- Signatures below are **shapes** (TypeScript as spec, not code).

---

## 1. Decisions taken in this plan

| # | Topic | Decision | Why |
| --- | --- | --- | --- |
| T1 | Value types | `TimeValue = PlainTime \| null`. `TimeRangeValue = { start: PlainTime \| null; end: PlainTime \| null } \| null`. Time ranges are **half-open** `[start, end)` like every timed interval (03 D9) | A shift 09:00–17:00 ends at 17:00. Partial ranges exist while picking |
| T2 | Granularity | `granularity: "hour" \| "minute" \| "second"` (default `"minute"`) decides which segments, columns and list entries exist. Values below the granularity are `0` | One option instead of separate show-seconds flags |
| T3 | 12/24-hour | `hourCycle: "h12" \| "h23"`, default from `getHourCycle(locale)` (03 §3.2). In 12-hour mode a day-period part (AM/PM) exists; its labels come from `getDayPeriodNames(locale)`. Typing the first letter of a label sets it | Locale-correct by default, overridable (BRD §7.4) |
| T4 | Step | `step: { minutes?: number; seconds?: number }` (03 `TimeConstraints.step`). ↑/↓ in a minute segment move by the step; columns and lists only offer aligned values | "Configurable minute intervals" (patch §4) |
| T5 | Off-step typed values | Typed values that are not on the step are **kept** and reported as `validity: "off-step"`. Chrono never rewrites what the user typed (same principle as 06 A11). `snap` helpers are exported for apps that want to snap on blur | Decided (§12.2) |
| T6 | Overnight ranges | `allowOvernight` (default `false`). When `true`, `end ≤ start` means the range ends on the next day (`23:00–02:00`). State exposes `crossesMidnight` and `duration` (minutes). When `false`, `end ≤ start` is `validity: "end-before-start"` | Night shifts and bar opening hours without a date |
| T7 | Range limits | `minDuration` / `maxDuration` (minutes) through `checkTimeRange` (03 §3.3). While picking in a panel, ends that would break them get `data-range-blocked` (same signal as 06 A6) | Users see the limit before they hit it |
| T8 | Panel layouts | `TimePanel` has two layouts: `layout: "columns"` (one listbox per part: hour, minute, second, period) and `layout: "list"` (one listbox of times every `step`, or explicit `slots`). `TimeRangePanel` supports **both** (decided, §12.1): `"list"` (default for ranges, T10) and `"columns"` = two column sets side by side, **start** and **end**, each with the same columns as `TimePanel` (T20) | Columns suit exact times (shift start/end); lists suit slots |
| T9 | Slots | List layout with `slotDuration` (minutes) turns each entry into a slot `[start, start + slotDuration)`. Slots come from `start`/`end`/`slotDuration` + constraints, or from an explicit `slots` array (`{ start, end?, available?, data? }`). The value is the slot's **start** (`PlainTime`); `onValueChange` receives `info.slot` with `end` and the app's `data` | Appointment booking (F15) without a second value type |
| T10 | Range picking in a list | Two picks, like 06 A5: first pick = start, hover/focus previews, second pick = end. With `slotDuration`, the end is the **end of the picked slot** (picking 09:00 and 10:30 slots of 30 min gives 09:00–11:00). Without it, the end is the picked time. A second pick before the start swaps (unless `allowOvernight`, where it means "next day") | Matches how people book consecutive slots |
| T11 | Grouping | List layout `groupBy: false \| "hour" \| "dayPeriod" \| ((time) => { key: string; label: string })`. `"dayPeriod"` labels come from `Intl.DateTimeFormat` with `dayPeriod: "long"` ("in the morning"…), so no extra messages | Grouped slot lists (patch §4) with localized labels for free |
| T12 | Change vs commit | Same rule as 06 A2. Columns: commit when the user picks in the **last** visible column or presses Enter. List: commit on pick. Range (list): commit when the end is picked and the range is valid. Range (columns): commit when the user picks in the last column of the **end** set (or presses Enter there) and the range is valid | The app knows when to close its popup |
| T13 | Panel keyboard | **One tab stop** for the whole panel (§12.3). Columns: ←/→ move between columns (in a range panel, across the start set then the end set), ↑/↓ move within a column, Home/End, PageUp/PageDown (hours ±3, minutes/seconds ±15), digit type-ahead ("1" then "5" → 15), Enter/Space pick. List: ↑/↓, Home/End, PageUp/PageDown (±1 hour of entries), type-ahead ("9" → first 9:xx). Escape only cancels a range draft (06 A18) | Same "one tab stop, arrows inside" model as segments and grids |
| T14 | Disabled times | From `min`, `max`, `disabledRanges`, `isTimeDisabled` and unavailable slots. Options stay focusable but are not selectable (`aria-disabled`, `data-disabled` / `data-unavailable`, 03 D14). In columns, an hour is disabled only when every allowed minute in it is disabled; minute options are evaluated for the currently chosen hour | Matches the date rule; columns stay usable |
| T15 | Scroll | Listboxes scroll the focused/selected option into view (`scrollIntoView({ block: "nearest" })`) after keyboard moves and when the value changes (`scrollToSelected`, default `true`). This is DOM behavior, not styling | Long columns and slot lists must keep the active option visible |
| T16 | Shared input engine | The segment typing engine and the text tokenizer from plan 06 live in **`foundation/input/`** (generic over part definitions). `date/input` and `time/input` only define their parts. Plan 06 is updated to build them there from the start | Time cannot import Date (02 §2.6); duplicating the engine would break "no duplicated implementations" (02 §2.7) |
| T17 | Text mode | Parses `9`, `930`, `0930`, `9:30`, `9.30`, `9h30`, `21:30`, `9:30 pm`, `9 PM`, the locale's day-period names, and ISO (`09:30:00`). Re-formats valid input on blur with `formatTime`. `parse` / `format` options replace the built-ins. Unparseable text stays as typed (`onInvalidInput`) | 02 §2.2a; covers how people actually type times |
| T18 | "Now" | Time values have no zone. `timeZone` + `now` are only used for the `placeholderValue` default (current time) and an optional `data-now` marker on the list entry containing now. No "disable past times" in Time (needs a date → DateTime, F17) | Keeps Time date-free |
| T19 | Vanilla declarative init | `initTimeElements(root = document)` for `[data-chrono-time-input]`, `[data-chrono-time-panel]`, `[data-chrono-time-range-input]`, `[data-chrono-time-range-panel]`, same contract as 06 A20 (`data-*` options, DOM events, `data-chrono-for`, cleanup) | Per-domain name keeps `/time` free of Date code |
| T20 | Range columns | In `layout: "columns"`, the start set edits `start` and the end set edits `end` (each a partial value until complete). There is no hover preview; instead the end set marks options that would break the range (`end-before-start` unless `allowOvernight`, `minDuration`, `maxDuration`, T6/T7) with `data-range-blocked`, re-evaluated as the start changes. `slotDuration`/`slots`/`groupBy` are list-only options and are ignored in columns | Precise entry of shift times without typing, with the same blocked-option signal as lists |

Unchanged from plan 06 and reused as-is: forms (A15: hidden ISO inputs `09:30`, `09:30:15`
with seconds granularity, `startName`/`endName`), clear (A16, `TimeInputClearButton`),
read-only/disabled (A17), Escape (A18), `autoFocus` off by default (A8), placeholders from
`messages` (A12: `placeholderHour`, `placeholderMinute`, `placeholderSecond`,
`placeholderDayPeriod`), range inputs as two fields (A14).

---

## 2. Core: `time/` (`@zealakit/chrono-core/time`)

### 2.1 Folders

```text
packages/core/src/
├── foundation/input/                # T16 — moved here by plan 06 (see §10)
│   ├── segment-engine.ts            # generic typing / step / clear / auto-advance machine
│   ├── tokenize.ts                  # generic text tokenizer (numbers, words, separators)
│   └── form.ts                      # hidden inputs + form reset (06 A15)
└── time/
    ├── index.ts
    ├── selection/
    │   ├── single.ts
    │   ├── range.ts                 # T6, T7, T10
    │   └── slots.ts                 # T9: generate / normalize slots, availability
    ├── panel/
    │   ├── columns-model.ts         # T8 columns, T14 per-column disabled rules
    │   ├── list-model.ts            # T8 list, T11 grouping, T18 now marker
    │   ├── panel-keyboard.ts        # T13
    │   └── controllers.ts           # createTimePanelController / createTimeRangePanelController
    └── input/
        ├── parts.ts                 # hour / minute / second / dayPeriod part definitions (T2, T3)
        ├── parse.ts                 # T17 on top of foundation/input/tokenize
        ├── validity.ts              # incl. "off-step" (T5), "end-before-start" (T6)
        └── controllers.ts           # createTimeInputController / createTimeRangeInputController
```

Imports: `time/*` → `foundation/*` only. Foundation additions: the messages above plus
`startTime` / `endTime` (T20),
`getTimeFormatPattern(locale, hourCycle, granularity, messages)` (e.g. `hh:mm a`) in
`foundation/locale/format.ts`, and `getDayPeriodLabel(time, locale)` (T11).

### 2.2 Panel controllers

```ts
type TimePanelOptions = {
  value?: TimeValue; defaultValue?: TimeValue;
  onValueChange?: (v: TimeValue, info: { slot?: TimeSlot }) => void;
  onValueCommit?: (v: PlainTime, info: { slot?: TimeSlot }) => void;
  layout?: "columns" | "list";                 // default "columns"
  granularity?: "hour" | "minute" | "second";
  hourCycle?: "h12" | "h23";
  step?: { minutes?: number; seconds?: number };
  start?: TimeInput; end?: TimeInput;          // list range, default 00:00–24:00
  slotDuration?: number;                       // minutes, list only (T9)
  slots?: readonly TimeSlotInput[];            // explicit list (T9)
  groupBy?: false | "hour" | "dayPeriod" | ((t: PlainTime) => { key: string; label: string });
  min?: TimeInput; max?: TimeInput;
  disabledRanges?: readonly { start: TimeInput; end: TimeInput }[];
  isTimeDisabled?: (t: PlainTime) => boolean;
  isTimeUnavailable?: (t: PlainTime) => boolean;
  scrollToSelected?: boolean; autoFocus?: boolean;
  readOnly?: boolean; disabled?: boolean;
  locale?: string; timeZone?: string; now?: number;
  messages?: Partial<TimeMessages>;
};
type TimeRangePanelOptions = Omit<TimePanelOptions, "value" | "defaultValue" | "onValueChange" | "onValueCommit" | "layout"> & {
  layout?: "list" | "columns";               // default "list" (T8, T20)
  value?: TimeRangeValue; defaultValue?: …; onValueChange?: …;
  onValueCommit?: (v: { start: PlainTime; end: PlainTime }) => void;
  onRangePreviewChange?: …; onInvalidRange?: (reason: TimeRangeInvalidReason) => void;
  allowOvernight?: boolean; minDuration?: number; maxDuration?: number;
};
```

State: `value`, `draft`/`preview` (range), `columns` (per column: options with state) or
`groups` (list: groups of options), `focused` (`{ column?, key }`), `crossesMidnight`,
`duration`. Actions mirror 06 §2.2 (`pick`, `setPreview`, `cancelDraft`, `clear`, `commit`,
`focusOption`, `handleKeyDown`, `mount`/`unmount`).

Attribute contract (parity-tested):

| Element | Attributes |
| --- | --- |
| Root | `role="group"`, `data-chrono-time-panel` (`range` for the range panel), `data-layout`, `data-disabled`, `data-readonly` |
| Column (columns layout) | `role="listbox"`, `aria-label` (part name), `aria-activedescendant` is **not** used (real focus moves, roving `tabindex`), `data-chrono-part` |
| Group (list layout) | `role="group"`, `aria-labelledby` (group label element) |
| List | `role="listbox"`, `aria-label` (app), `aria-multiselectable` (`true` for the range panel) |
| Option | `role="option"`, `aria-selected`, `aria-disabled`, `aria-label` (formatted time, slot range "09:00 to 09:30", status words), `tabindex`, `data-chrono-key` (`09:30`), `data-selected`, `data-focused`, `data-disabled`, `data-unavailable`, `data-now`, `data-range-start`, `data-range-end`, `data-in-range`, `data-range-preview`, `data-range-blocked` |

### 2.3 Input controllers

`TimeInputOptions` mirror 06 §2.3 with Time types and: `granularity`, `hourCycle`, `step`,
`placeholderValue` (default: now in `timeZone`, rounded down to the step), `min`, `max`,
`disabledRanges`, `isTimeDisabled`. `TimeRangeInputOptions` add `allowOvernight`,
`minDuration`, `maxDuration`, `startName`, `endName`.

Segment rules (on the shared engine, T16): hour range 1–12 (h12) or 0–23 (h23); typing "2" in
h23 waits for a second digit, "3"–"9" auto-advance; minutes and seconds 0–59, ↑/↓ by `step`;
day-period part toggles with ↑/↓ and by typing the first letter. Segment attributes as 06 §2.3
(`role="spinbutton"`, `aria-valuenow/min/max/valuetext`, one tab stop, ←/→ between parts).

Validity: `"empty" | "incomplete" | "valid" | "before-min" | "after-max" | "disabled" |
"unavailable" | "off-step"` and, for ranges, `"end-before-start" | "too-short" | "too-long"`.

---

## 3. Adapters: the `/time` entry

### 3.1 Parts (same names in React, Vue, Svelte)

| Part | Default element | Notes |
| --- | --- | --- |
| `TimeInput` | `div` | Root (`role="group"`) |
| `TimeInputSegment`, `TimeInputLiteral`, `TimeInputTextField`, `TimeInputClearButton` | `span`, `span`, `input`, `button` | As the Date equivalents |
| `TimeRangeInput`, `TimeRangeInputStart`, `TimeRangeInputEnd` | `div` | Start/End provide a `TimeInput` context (06 A14) |
| `TimePanel` | `div` | Root, both layouts |
| `TimePanelColumn` | `div` | Columns layout: one per part. Children/slot receive the column |
| `TimePanelGroup`, `TimePanelGroupLabel` | `div`, `div` | List layout grouping (T11) |
| `TimePanelList` | `div` | List layout listbox |
| `TimePanelOption` | `div` | One option (time or slot). Children/slot receive the option incl. `slot.data` for custom presentation |
| `TimeRangePanel` | `div` | Root, both layouts. List: uses `TimePanelList`, `TimePanelGroup…`, `TimePanelOption`. Columns: uses `TimeRangePanelStart` / `TimeRangePanelEnd` |
| `TimeRangePanelStart`, `TimeRangePanelEnd` | `div` | Columns layout: one column set each (`role="group"`, `aria-label` from messages `startTime` / `endTime`). Each provides a column-set context, so `TimePanelColumn` and `TimePanelOption` work inside unchanged |

Hooks / controllers: `useTimeInput`, `useTimeRangeInput`, `useTimePanel`,
`useTimeRangePanel` (React, Vue, Svelte); Vanilla `createTimeInput`, `createTimeRangeInput`,
`createTimePanel`, `createTimeRangePanel`, `initTimeElements()` (T19). Bindings as plan 04
§3.2. List rendering helpers are internal to `src/time/internal/` (no other domain needs them
yet).

### 3.2 Entry points

- Core and adapter `package.json`: `./time`. Root entries add
  `export * from "./time/index.js"`.
- `src/time/index.ts` exports the parts, hooks/controllers, types, and depth-1 utilities from
  the Time scope (patch §4): `getTimeStatus`, `snapTime`, `checkTimeRange`, `getTimeSlots`
  (T9 generator), `compare`, `isSameTime`, `toPlainTime`, `toIsoString`, `formatTime`,
  `parseTime` (T17), `getHourCycle`. Shared helpers are re-exported from core, so names shared
  with `/date` (`compare`, `toIsoString`) are the same bindings.
- `entries.test.ts` checks three subpaths. Reachability: `dist/time/index.js` must not reach
  `dist/date/`, `dist/calendar/`, or core `date/` / `calendar/`. A dedicated test imports
  **only** `TimeInput` from the root entry and checks (via the graph walker) that the reached
  files exclude Date and Calendar (02 §7 "importing only `TimeInput` from the root").

---

## 4. Examples and integration recipes

- Each framework example adds:
  - **Opening-hours editor** (02 §8): seven weekday rows, each a `TimeRangeInput` (segmented),
    one row with `allowOvernight` (a late bar), "closed" toggle owned by the app. No date
    anywhere.
  - **Appointment slots**: `TimePanel` list layout with `slotDuration: 30`, `groupBy:
    "dayPeriod"`, some unavailable slots, `slot.data` showing staff names in custom option
    content.
  - Columns layout inline with 12-hour and 24-hour locales side by side.
  - Text mode `TimeInput` showing the accepted formats.
- Integration example apps from plan 06 §4 (`react-overlay`, `react-radix`, `react-base-ui`,
  `vue-overlay`, `svelte-overlay`, vanilla `<dialog>`) add a `TimeInput` + `TimePanel`
  (columns) recipe in a popover, closing on `onValueCommit`.

---

## 5. Tests

Core (four `TZ` zones — results must not depend on them, since Time has no zone):

| File | Proves |
| --- | --- |
| `foundation/input/segment-engine.test.ts` | Generic engine with fake part definitions: typing, auto-advance, step, wrap, clear, paste (shared by Date and Time) |
| `time/input/parts.test.ts` | h12/h23 typing rules, day-period letters for `en-US`, `vi-VN`, `zh-CN`, `ko-KR`, `ar-EG`; granularity |
| `time/input/parse.test.ts` | T17 table per locale, invalid and ambiguous inputs |
| `time/input/validity.test.ts` | Every validity state incl. off-step and range reasons |
| `time/selection/*.test.ts` | Single, range (T6, T7, T10, swap vs overnight), slots generation and explicit slots, availability |
| `time/panel/columns-model.test.ts` | Per-column disabled rules (T14), commit on last column; range columns (T20): blocked end options for end-before-start, overnight, min/max duration, re-evaluated when start changes; commit only from the end set |
| `time/panel/list-model.test.ts` | Steps, slots, grouping (`hour`, `dayPeriod`, custom), now marker |
| `time/panel/panel-keyboard.test.ts` | T13 tables, type-ahead, PageUp/Down sizes, Escape only with a draft |

Adapters (React, Vue, Svelte, Vanilla): `time-input`, `time-range-input`, `time-panel`
(both layouts), `time-range-panel` (both layouts), `time-compose` (Input + Panel shared value),
`time-escape`, `time-scroll` (stubbed `scrollIntoView` called on keyboard moves and value
changes), parity, SSR, no-styles, and `declarative` (Vanilla, `initTimeElements`).

Manual a11y: VoiceOver + NVDA on columns, list with groups, segmented 12-hour input, and the
`react-overlay` recipe.

---

## 6. Size budgets

| Entry | Ceiling (gzip) |
| --- | --- |
| `core/time` | 8 KB |
| `<adapter>/time` (incl. reached core) | 22 KB |
| `<adapter>/root` | sum of the shipped subpath ceilings |

The `foundation` ceiling (03, 05: 11 KB) rises to **12 KB** for `foundation/input`, which
Date and Time now share.

---

## 7. Docs and agent files

- Adapter READMEs (EN/VI/CN): Time section — the four components, no-date principle, h12/h23,
  steps and off-step validity, overnight ranges, slots and grouping, both panel layouts,
  keyboard tables, recipes.
- Root README: list `/time`.
- `skills/chrono-*.md`: "opening hours" and "appointment slots" steps.
- `.agents/AGENTS.md` + skill: `/time` shipped; `foundation/input` is the only home for
  segment/tokenizer logic (T16).

---

## 8. Delivery (PR breakdown)

| PR | Content |
| --- | --- |
| 1 | `foundation/input` engine + tokenizer (if plan 06 has not landed it yet; otherwise skip) + tests |
| 2 | Core `time/input` + `time/selection` + tests |
| 3 | Core `time/panel` + attribute contract + tests; `./time` core export |
| 4 | React `/time` |
| 5 | Vue `/time` |
| 6 | Svelte `/time` |
| 7 | Vanilla `/time` + `initTimeElements` + parity |
| 8 | Examples and recipes, docs, size budgets |
| Release | `0.4.0-next.1` on the `next` dist-tag, same steps as 06 §8 Release (maintainer publishes, `latest` stays `0.3.0`). If plan 06 has not been released yet, the two ship together as `0.4.0-next.0` |

PRs 5–7 can run in parallel after PR 4. Plan 06 and this plan can run in parallel except for
PR 1 (whichever lands first builds `foundation/input`; the other rebases on it).

---

## 9. Definition of done

- All checks from 06 §9 pass with three subpaths.
- F15, F16 and the Time part of F19 covered by core and adapter tests.
- `/time` and a root import of only `TimeInput` reach no Date or Calendar code.
- Parity snapshots identical across adapters; manual screen-reader check recorded.

---

## 10. Changes to earlier plans

- **06:** the segment engine, text tokenizer and form helpers are built in `foundation/input/`
  (`segment-engine.ts`, `tokenize.ts`, `form.ts`); `date/input/parts.ts` and
  `date/input/parse.ts` only add date part definitions and date parsing rules (T16). Plan 06
  is updated accordingly.
- **02 §4:** no new vocabulary (`data-now` reused on list options).

---

## 11. Out of scope

- Dates, time zones and "past time" rules (DateTime, `08-datetime.md`).
- Durations as values (e.g. "1 h 30 min" pickers) — not in the BRD scope.
- Popups and convenience Input + Panel fields (02 §2.2, §2.8).

---

## 12. Open questions

1. ~~**`TimeRangePanel` layouts**~~ — **decided: list and columns.** Columns = start and end
   column sets (T20); list stays the default for ranges.
2. ~~**Off-step typed values**~~ — **decided: keep and mark `off-step`** (T5). No automatic
   snapping; `snapTime` is exported for apps that want it.
3. **Panel tab stops** — one tab stop for the whole panel with ←/→ between columns
   (recommended, T13), or one tab stop per column (each column its own listbox in the tab
   order)?
