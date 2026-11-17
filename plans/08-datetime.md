# Plan: stage 4c — DateTime domain (`/datetime`)

Status: **proposal — not implemented**.

Order: **8 of N**. Last stage-4 plan in `02-implement-business-flow.md` §9. Runs after
`06-date.md` and `07-time.md` (both on `next`). Implements flows **F17** (DateTimeInput,
DateTimePanel), **F18** (DateTimeRangeInput, DateTimeRangePanel) and the DateTime part of
**F19**. Ends stage 4 with the final **`0.4.0`** release on `latest`.

Goal: add the `/datetime` subpath to every adapter. DateTime **composes** Date and Time
(BRD patch §5): it reuses their core controllers and their adapter parts, and adds only what
needs both a date and a time — cross-part constraints, time zones, DST handling and combined
values.

**Scope rule:**
- `/datetime` may reach Date, Time and foundation code, never Calendar (02 §2.6).
- **No duplicated logic**: date selection, time selection, segment typing and parsing come
  from `date/`, `time/` and `foundation/input/` (02 §2.7, 07 T16).
- No popup, positioning, dismissal or CSS (02 §2.2, §2.8). No time-zone **picker** UI (§11).
- Conventions from plans 06/07 (change vs commit, forms, clear, read-only/disabled, Escape,
  `autoFocus` off, one tab stop per panel, two-field range inputs, vanilla declarative init)
  apply unchanged unless restated.
- Signatures below are **shapes** (TypeScript as spec, not code).

---

## 1. Decisions taken in this plan

| # | Topic | Decision | Why |
| --- | --- | --- | --- |
| X1 | Value types | `DateTimeValue` is `PlainDateTime \| null` when no `timeZone` is set, and `ZonedDateTime \| null` when it is (02 §2.1, 02 §11.6: zoned objects only, never strings or `Date`). TypeScript overloads pick the type from the options. Ranges: `{ start, end }` with the same element type, **half-open** (03 D9) | One rule for every DateTime component; the type tells the app which kind it gets |
| X2 | Display zone vs value zone | `timeZone` = the zone the user sees and edits. Optional `valueTimeZone` = the zone of the emitted `ZonedDateTime` (same instant, e.g. `"UTC"` for storage). Incoming values in any zone are converted to `timeZone` for editing | Apps store in UTC or a venue zone while users edit in their own zone (02 F17 "consumer decides the authoritative zone") |
| X3 | DST gaps and overlaps | `disambiguation` (03 D8, default `"compatible"`). A wall time inside a **gap** resolves per the option; the typed or picked wall time is **kept on screen** and the state reports `adjusted: true` (`data-adjusted`, label suffix from messages). With `"reject"`, it is `validity: "nonexistent-time"`. An **overlap** resolves per the option (`"compatible"` = earlier offset) | Never rewrite what the user typed (06 A11) while still producing a correct instant |
| X4 | DST-aware time lists | When the time part uses the list layout and the chosen day has a DST change, entries are real instants of that day: times in the gap are left out, times in the repeated hour appear **twice**, each with its offset in the label and `data-offset` (§12.3) | Lets users pick the exact instant on the two DST days without extra UI |
| X5 | Cross-part constraints | `min` / `max` accept date-times. Days before `min`'s day (after `max`'s day) are disabled; on the boundary day, times before `min` (after `max`) are disabled. `disablePast: true` = `min` is now (in `timeZone`, `now` injectable). `isTimeDisabled(time, date)` receives the chosen date. Time options re-evaluate when the date changes | F17 "today's past times are disabled when `min = now`" |
| X6 | Composition of panels | `DateTimePanel` = a `DatePanel` controller + a `TimePanel` controller wired by `datetime/` core. Adapter parts are **containers** that provide the Date and Time contexts; the grid, cells, columns and options inside are the existing parts imported from `/date` and `/time` (`DatePanelGrid`, `DatePanelCell`, `TimePanelColumn`, `TimePanelOption` …) | Patch §5 "reuse and compose rather than duplicate". The subpath still exposes only DateTime API; the app imports the inner parts from their own subpaths |
| X7 | Partial state and `defaultTime` | Internally the panel holds `{ date, time }`. `value` is set only when both exist. `defaultTime` (e.g. `"09:00"`) fills the time when a date is picked first, so the value is complete at once. Picking a new date keeps the current time (re-checked against X5; if it becomes disabled, the value goes `null` and the time option is marked) | Common flow "pick a day, then a time" without a half value leaking to the app |
| X8 | Commit | `onValueCommit` fires when the **time part commits** (07 T12) while a date is chosen and the value is valid. Picking a date never commits (§12.2) | The time is the last decision in "day, then time"; the app closes its popup then |
| X9 | Range panel | `DateTimeRangePanel` = a `DateRangePanel` controller + **two** `TimePanel` controllers (start time, end time). Validation across days: `end > start` as instants, `minDuration` / `maxDuration` (minutes), X5 bounds. End-time options that would make an invalid range get `data-range-blocked` (06 A6, 07 T20). Commit when the end time commits and the range is valid | Booking check-in/check-out with times. No overnight flag is needed because the end date is explicit |
| X10 | Inputs | `DateTimeInput` segmented mode: **one** group of segments in the locale's date-time order (`formatToParts` of a date-time), date parts and time parts on the shared engine (07 T16) with the date and time part definitions. Text mode: one field parsed by composing the date and time parsers (`17/11/2026 9:30`, `2026-11-17T09:30`, `Nov 17 2026 9:30 pm`) (§12.1). `DateTimeRangeInput` = two such fields (06 A14) | Matches native `datetime-local` and how people type a moment |
| X11 | Zone label | Optional `DateTimeInputTimeZone` part shows the display zone (`Intl.DateTimeFormat` `timeZoneName: "shortGeneric"`, e.g. "Vietnam Time"); read-only text, `aria-hidden` is **not** set (it is useful context) | Users need to know which zone they edit in; choosing a zone is the app's UI |
| X12 | Forms | Hidden input value: zoned → ISO with offset (`2026-11-17T09:30:00+07:00`), plain → `2026-11-17T09:30` (seconds only with second granularity). `formValue?: (value) => string` overrides (e.g. to add `[Asia/Ho_Chi_Minh]` or send UTC) | Works with typical backends; apps can choose |
| X13 | Vanilla declarative init | `initDateTimeElements(root = document)` for `[data-chrono-datetime-input]`, `[data-chrono-datetime-panel]`, `[data-chrono-datetime-range-input]`, `[data-chrono-datetime-range-panel]`, same contract as 06 A20 / 07 T19. The panel renders the Date and Time markup inside its host | Per-domain init name (02 §11.5) |

---

## 2. Core: `datetime/` (`@zealakit/chrono-core/datetime`)

### 2.1 Folders

```text
packages/core/src/datetime/
├── index.ts
├── zone/
│   ├── resolve.ts        # X2/X3: wall time ↔ instant in display zone, value-zone conversion,
│   │                     # adjusted flag (uses foundation/values/zoned)
│   └── day-instants.ts   # X4: real instants of a day for a time list on DST days
├── constraints.ts        # X5: date-time min/max, disablePast, per-date time rules
├── panel/
│   ├── controller.ts     # createDateTimePanelController: wires date + time controllers (X6–X8)
│   └── range-controller.ts  # createDateTimeRangePanelController (X9)
└── input/
    ├── parts.ts          # locale date-time part order (date parts from date/input, time parts
    │                     # from time/input)
    ├── parse.ts          # composes date/input/parse + time/input/parse (X10)
    └── controllers.ts    # createDateTimeInputController / createDateTimeRangeInputController
```

Imports: `datetime/*` → `date/*`, `time/*`, `foundation/*` (02 §2.6). Never `calendar/*`.
`check-domains.mjs` already allows this row.

Foundation additions: messages `adjustedTime` ("adjusted for daylight saving time"),
`timeZone`, `startDateTime`, `endDateTime`; `getTimeZoneLabel(timeZone, locale)` (X11) in
`foundation/locale/`.

### 2.2 Panel controllers

```ts
type DateTimePanelOptions<Z extends string | undefined> = {
  value?: DateTimeValueOf<Z>; defaultValue?: DateTimeValueOf<Z>;
  onValueChange?: (v: DateTimeValueOf<Z>, info: { adjusted: boolean }) => void;
  onValueCommit?: (v: NonNullable<DateTimeValueOf<Z>>) => void;
  timeZone?: Z; valueTimeZone?: string;
  disambiguation?: Disambiguation;
  defaultTime?: TimeInput;
  min?: DateTimeInput; max?: DateTimeInput; disablePast?: boolean;
  isDateDisabled?: (d: PlainDate) => boolean; isDateUnavailable?: …;
  isTimeDisabled?: (t: PlainTime, d: PlainDate) => boolean; isTimeUnavailable?: …;
  date?: Omit<DatePanelOptions, "value" | "defaultValue" | "onValueChange" | "onValueCommit" | "min" | "max">;
  time?: Omit<TimePanelOptions, "value" | "defaultValue" | "onValueChange" | "onValueCommit" | "min" | "max">;
  locale?: string; now?: number; readOnly?: boolean; disabled?: boolean; autoFocus?: boolean;
  messages?: Partial<DateTimeMessages>;
};
type DateTimeRangePanelOptions<Z> = … & {
  minDuration?: number; maxDuration?: number;
  date?: Omit<DateRangePanelOptions, …>;
  startTime?: Omit<TimePanelOptions, …>; endTime?: Omit<TimePanelOptions, …>;
};
```

The nested `date` / `time` option objects pass Date- and Time-specific settings (levels,
months, layout, step, granularity, slots …) straight to the composed controllers.

State: `value`, `draft` (`{ date, time }`), `adjusted`, `date` (the Date panel state), `time`
(the Time panel state), and for ranges `startTime` / `endTime` states plus range validity.
Actions: the composed controllers' actions plus `clear()`, `commit()`.

Attributes: the root adds `data-chrono-datetime-panel` (`range` for the range panel) and
`data-adjusted`; everything inside uses the Date and Time attribute contracts unchanged (06
§2.2, 07 §2.2). Time options gain `data-offset` (X4) on DST days.

### 2.3 Input controllers

`DateTimeInputOptions` = the panel's value/zone/constraint options + 06/07 input options
(`mode`, `granularity`, `hourCycle`, `step`, `placeholderValue`, `parse`, `format`,
`onInvalidInput`, `name`, `formValue`, `required`, `readOnly`, `disabled`).

Validity: union of Date and Time validity + `"nonexistent-time"` (X3 with `"reject"`) and,
for ranges, `"end-before-start" | "too-short" | "too-long"`.

---

## 3. Adapters: the `/datetime` entry

### 3.1 Parts

| Part | Default element | Notes |
| --- | --- | --- |
| `DateTimeInput` | `div` | Root (`role="group"`) |
| `DateTimeInputSegment` | `span` | Any date or time part (X10). Built on the adapter's `src/shared/input/segment` renderer, which `DateInputSegment` and `TimeInputSegment` also use (moved there in this plan, no behavior change) |
| `DateTimeInputLiteral`, `DateTimeInputTextField`, `DateTimeInputClearButton` | `span`, `input`, `button` | As in 06/07 |
| `DateTimeInputTimeZone` | `span` | X11 |
| `DateTimeRangeInput`, `DateTimeRangeInputStart`, `DateTimeRangeInputEnd` | `div` | Start/End provide a `DateTimeInput` context |
| `DateTimePanel` | `div` | Root |
| `DateTimePanelDate` | `div` | Provides the Date panel context: put `DatePanelTitle`, `DatePanelGrid`, `DatePanelCell` … (from `/date`) inside |
| `DateTimePanelTime` | `div` | Provides the Time panel context: put `TimePanelColumn` / `TimePanelList` / `TimePanelOption` … (from `/time`) inside |
| `DateTimeRangePanel` | `div` | Root |
| `DateTimeRangePanelDate` | `div` | Date range panel context |
| `DateTimeRangePanelStartTime`, `DateTimeRangePanelEndTime` | `div` | Time panel contexts for start and end time |

Hooks / controllers: `useDateTimeInput`, `useDateTimeRangeInput`, `useDateTimePanel`,
`useDateTimeRangePanel` (React, Vue, Svelte); Vanilla `createDateTimeInput`,
`createDateTimeRangeInput`, `createDateTimePanel`, `createDateTimeRangePanel`,
`initDateTimeElements()` (X13).

Context compatibility is the key adapter work: the Date and Time parts read their context
through an internal accessor that the DateTime containers can provide. This accessor lives in
the adapter's `src/shared/` (not a domain), so `/date` and `/time` do not import `/datetime`.

### 3.2 Entry points

- Core and adapter `package.json`: `./datetime`; root entries add
  `export * from "./datetime/index.js"`. All four domains are now shipped.
- `src/datetime/index.ts` exports the DateTime parts, hooks/controllers, types and depth-1
  utilities from the DateTime scope: `toZoned`, `fromInstant`, `toInstant`, `withTimeZone`,
  `getTimeZoneLabel`, `formatDateTime`, `parseDateTime` (X10 parser), `checkDateTimeRange`.
  It does **not** re-export Date or Time parts (each subpath exposes only its domain).
- `entries.test.ts` checks four subpaths; root export names = union of all four; no
  collisions. Reachability: `/datetime` reaches `date/`, `time/`, `foundation/`, never
  `calendar/`.

---

## 4. Examples and recipes

- Framework examples add:
  - **Meeting scheduler**: `DateTimeInput` + `DateTimePanel` with `disablePast`,
    `timeZone` = the browser zone, `valueTimeZone: "UTC"`; the example shows the stored value
    with `toIsoString`. Zone label part visible.
  - **Check-in / check-out**: `DateTimeRangePanel` (2 months, list-layout times with 30-min
    step) + `DateTimeRangeInput`, `minDuration: 60`.
  - **DST demo**: `timeZone: "America/New_York"` on 2026-11-01 (repeated hour shown twice)
    and 2026-03-08 (gap skipped; typing 02:30 shows the adjusted note).
- Integration apps (06 §4) add the meeting-scheduler recipe in a popover; close on
  `onValueCommit`.

---

## 5. Tests

Core (four `TZ` zones; results must not depend on the host zone, only on `timeZone`):

| File | Proves |
| --- | --- |
| `datetime/zone/resolve.test.ts` | Display ↔ value zone round trips; every 2026 DST change in New York and Lord Howe with all four `disambiguation` values; `adjusted` flag |
| `datetime/zone/day-instants.test.ts` | X4 lists on gap and overlap days, offsets in labels |
| `datetime/constraints.test.ts` | X5 boundary days, `disablePast` with injected `now` near midnight in several zones, `isTimeDisabled(time, date)` |
| `datetime/panel/*.test.ts` | X7 partial state and `defaultTime`, date change keeps time or clears it, X8 commit timing, X9 range validation and blocked end times |
| `datetime/input/*.test.ts` | Locale part order (`en-US`, `en-GB`, `vi-VN`, `zh-CN`, `ar-EG`), combined parse table, validity incl. `nonexistent-time` |
| `datetime/no-duplication.test.ts` | Static check: `datetime/` contains no selection, segment or parsing logic of its own (imports the Date/Time/foundation modules instead) — guards patch §5 |

Adapters (React, Vue, Svelte, Vanilla): `datetime-input`, `datetime-range-input`,
`datetime-panel`, `datetime-range-panel`, `datetime-compose` (Date/Time parts inside DateTime
containers render and behave exactly as standalone), `datetime-escape`, parity, SSR,
no-styles, `declarative` (Vanilla).

Manual a11y: VoiceOver + NVDA on the meeting-scheduler recipe and the DST demo.

---

## 6. Size budgets

| Entry | Ceiling (gzip) |
| --- | --- |
| `core/datetime` (own code only) | 6 KB |
| `<adapter>/datetime` (incl. reached date, time, foundation) | 48 KB |
| `<adapter>/root` | sum of the four subpath ceilings, minus shared code counted once (measured) |

---

## 7. Docs and agent files

- Adapter READMEs (EN/VI/CN): DateTime section — composition with Date/Time parts, value types
  by `timeZone`, display vs value zone, DST behavior, `disablePast`, `defaultTime`, commit
  rule, forms, recipes. A "which component do I need?" table across all four domains.
- Root README: all four subpaths available; both import styles with the full root import
  example from the BRD packaging decision (02 §2.7).
- `skills/chrono-*.md`: "date-time picker with time zones" steps.
- `.agents/AGENTS.md` + skill: stage 4 complete; the no-duplication rule for `datetime/` as a
  hard boundary.

---

## 8. Delivery (PR breakdown)

| PR | Content |
| --- | --- |
| 1 | Core `datetime/zone` + `constraints` + tests |
| 2 | Core `datetime/panel` (single + range) + tests |
| 3 | Core `datetime/input` + tests; `./datetime` core export; no-duplication test |
| 4 | React `/datetime` (+ shared segment renderer and context accessor moves in `src/shared/`) |
| 5 | Vue |
| 6 | Svelte |
| 7 | Vanilla + `initDateTimeElements` + parity |
| 8 | Examples, recipes, docs, size budgets |
| Release | Final **`0.4.0`** on `latest` (02 §9): version all packages to `0.4.0`, run the checks, the **maintainer** publishes without `--tag` (the publish script sends plain versions to `latest`), tag `v0.4.0`, GitHub release covering all of stage 4, smoke-test installs with all four subpaths. After it, `next` points to the last prerelease; the maintainer may move `next` to `0.4.0` |

PRs 5–7 can run in parallel after PR 4.

---

## 9. Definition of done

- All checks from 06 §9 pass with four subpaths; all examples and integration apps build.
- F17, F18 and the DateTime part of F19 covered by core and adapter tests.
- `/datetime` reaches no Calendar code; `datetime/` passes the no-duplication test.
- Parity snapshots identical across adapters; manual screen-reader check recorded.
- `0.4.0` installs from `latest` and builds with both import styles in every framework.

---

## 10. Changes to earlier plans

- **06 / 07:** `DateInputSegment` and `TimeInputSegment` move onto a shared segment renderer in
  the adapters' `src/shared/input/`, and their contexts are read through a shared accessor so
  DateTime containers can provide them (§3.1). No behavior or API change.
- **02 §4:** vocabulary gains `data-adjusted` and `data-offset`.

---

## 11. Out of scope

- A time-zone picker or zone search UI (apps build it; `getTimeZoneLabel` helps).
- Recurrence and calendar events (stage 5).
- Non-Gregorian calendars (02 §2.1).
- Popups and convenience fields (02 §2.2, §2.8).

---

## 12. Open questions

1. **DateTimeInput text mode** — one combined field (recommended, X10), or two fields (a date
   field and a time field) inside one DateTimeInput?
2. **DateTimePanel commit** — commit when the time part commits (recommended, X8), or also when
   a date is picked while a time is already set?
3. **DST time lists** — show the repeated hour twice with offsets and skip the gap (recommended,
   X4), or keep the normal list and rely on `disambiguation` only?
