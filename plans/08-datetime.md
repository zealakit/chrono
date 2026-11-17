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
| X4 | DST-aware time lists | When the time part uses the list layout and the chosen day has a DST change, entries are real instants of that day: times in the gap are left out, times in the repeated hour appear **twice**, each with its offset in the label and `data-offset` (decided, §12.3). The columns layout cannot show two identical times, so it uses `disambiguation` (X3) | Lets users pick the exact instant on the two DST days without extra UI |
| X5 | Cross-part constraints | `min` / `max` accept date-times. Days before `min`'s day (after `max`'s day) are disabled; on the boundary day, times before `min` (after `max`) are disabled. `disablePast: true` = `min` is now (in `timeZone`, `now` injectable). `isTimeDisabled(time, date)` receives the chosen date. Time options re-evaluate when the date changes | F17 "today's past times are disabled when `min = now`" |
| X6 | Composition of panels | `DateTimePanel` = a `DatePanel` controller + a `TimePanel` controller wired by `datetime/` core. Adapter parts are **containers** that provide the Date and Time contexts; the grid, cells, columns and options inside are the existing parts imported from `/date` and `/time` (`DatePanelGrid`, `DatePanelCell`, `TimePanelColumn`, `TimePanelOption` …) | Patch §5 "reuse and compose rather than duplicate". The subpath still exposes only DateTime API; the app imports the inner parts from their own subpaths |
| X7 | Partial state and `defaultTime` | Internally the panel holds `{ date, time }`. `value` is set only when both exist. `defaultTime` (e.g. `"09:00"`) fills the time when a date is picked first, so the value is complete at once. Picking a new date keeps the current time (re-checked against X5; if it becomes disabled, the value goes `null` and the time option is marked) | Common flow "pick a day, then a time" without a half value leaking to the app |
| X8 | Commit | `onValueCommit` fires when the **time part commits** (07 T12) while a date is chosen and the value is valid. Picking a date never commits, even when a time is already set (decided, §12.2) | The time is the last decision in "day, then time"; the app closes its popup then |
| X9 | Range panel | `DateTimeRangePanel` = a `DateRangePanel` controller + **two** `TimePanel` controllers (start time, end time). Validation across days: `end > start` as instants, `minDuration` / `maxDuration` (minutes), X5 bounds. End-time options that would make an invalid range get `data-range-blocked` (06 A6, 07 T20). Commit when the end time commits and the range is valid | Booking check-in/check-out with times. No overnight flag is needed because the end date is explicit |
| X10 | Inputs | `DateTimeInput` segmented mode: **one** group of segments in the locale's date-time order (`formatToParts` of a date-time), date parts and time parts on the shared engine (07 T16) with the date and time part definitions. Text mode: **two native fields** inside the one `DateTimeInput` (decided, §12.1) — a date field parsed by the Date parser (06 A13) and a time field parsed by the Time parser (07 T17), each with its own label. Pasting a full date-time (`2026-11-17T09:30`, `17/11/2026 9:30`) into either field fills both. The value exists when both fields are valid. `DateTimeRangeInput` = start and end, each with its date and time fields (06 A14) | Each field keeps its own simple parser and label; mobile keyboards fit each field; segmented mode stays one group like native `datetime-local` |
| X11 | Zone label | Optional `DateTimeInputTimeZone` part shows the display zone (`Intl.DateTimeFormat` `timeZoneName: "shortGeneric"`, e.g. "Vietnam Time"); read-only text, `aria-hidden` is **not** set (it is useful context) | Users need to know which zone they edit in; choosing a zone is the app's UI |
| X12 | Forms | Hidden input value: zoned → ISO with offset (`2026-11-17T09:30:00+07:00`), plain → `2026-11-17T09:30` (seconds only with second granularity). `formValue?: (value) => string` overrides (e.g. to add `[Asia/Ho_Chi_Minh]` or send UTC) | Works with typical backends; apps can choose |
| X13 | Vanilla declarative init | `initDateTimeElements(root = document)` for `[data-chrono-datetime-input]`, `[data-chrono-datetime-panel]`, `[data-chrono-datetime-range-input]`, `[data-chrono-datetime-range-panel]`, same contract as 06 A20 / 07 T19. The panel renders the Date and Time markup inside its host | Per-domain init name (02 §11.5) |
| X14 | Display formats | DateTime Inputs accept the combined `formatOptions` of 06 A22 and 07 T21; the part order comes from `formatToParts` of the combined options | BRD §7.5 |
| X15 | Range presets | `getPresetRange` (06 A21) also returns date-time ranges when given a `timeZone` (`[start of first day, start of the day after the last day)` in that zone, half-open) for DateTime range filters | Reporting filters on timestamps without off-by-one-day errors |

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
    ├── parse.ts          # paste splitting + parseDateTime utility, built on date/ and time/ parsers (X10)
    └── controllers.ts    # createDateTimeInputController / createDateTimeRangeInputController
```

Imports: `datetime/*` → `date/*`, `time/*`, `foundation/*` (02 §2.6). Never `calendar/*`.
`check-domains.mjs` already allows this row.

Foundation additions: messages `date`, `time`, `adjustedTime` ("adjusted for daylight saving time"),
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
| `DateTimeInputLiteral`, `DateTimeInputClearButton` | `span`, `button` | As in 06/07 |
| `DateTimeInputDateField`, `DateTimeInputTimeField` | `input`, `input` | Text mode: the two fields (X10). `aria-label` from messages `date` / `time` unless the app labels them |
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
  `getTimeZoneLabel`, `formatDateTime`, `parseDateTime` (X10: parses a full date-time string, also used for paste), `checkDateTimeRange`.
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
| `datetime/input/*.test.ts` | Locale part order (`en-US`, `en-GB`, `vi-VN`, `zh-CN`, `ar-EG`), text mode: each field parses alone, paste of a full date-time fills both fields, value only when both are valid; `parseDateTime` table; validity incl. `nonexistent-time` |
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

1. ~~**DateTimeInput text mode**~~ — **decided: two fields** (date + time) inside one
   `DateTimeInput`; paste of a full date-time fills both (X10).
2. ~~**DateTimePanel commit**~~ — **decided: on time commit only** (X8). Picking a date never
   commits, even when a time is already set.
3. ~~**DST time lists**~~ — **decided: show real instants** (X4): gap times left out, the
   repeated hour listed twice with offsets. Columns layout still uses `disambiguation`.

All open questions are decided.

---

## 13. Implementation guide (added after stages 1–2 shipped)

Read [`00-conventions-as-built.md`](00-conventions-as-built.md), then 06 §13 and 07 §13 (the segment
engine, parser rules, range machines, parity kinds, prerelease tag and name rules are specified there and
**reused** here). Decisions X1–X15 stay unless a bullet below says otherwise.

### 13.1 Reconciliations with the as-built code

| # | Problem | Resolution |
| --- | --- | --- |
| R1 | **Name clash: `DateTimeInput`.** Plan 05 adds a foundation *type* `DateTimeInput`; this plan adds a *component* with the same name. | The adapters export the type as **`DateTimeInputValue`** (06 R1 rule, 00 §3). `DateTimePanelOptions` etc. keep using the core name internally. |
| R2 | **Context accessor location (§3.1).** `src/shared/` may import only foundation and `shared/` (check-domains), so it cannot hold typed Date/Time panel contexts. | Do **not** put contexts in `shared/`. Each of `date/` and `time/` keeps its own internal context module (`date/internal/context.*`, `time/internal/context.*`, **not** exported from `date/index.ts` / `time/index.ts`). The `datetime/` containers import those internal modules by relative path and provide the **same context objects**; `check-domains` allows `datetime/ → date/, time/`. The `entries.test.ts` reachability test for `/date` and `/time` must still pass (they never reach `datetime/`). Only the generic **segment renderer** (`shared/input/segment.*`, typed over foundation `SegmentState`) moves to `shared/`. |
| R3 | **Generics on components.** `DateTimeValueOf<Z>` overloads cannot be expressed on Vue `defineComponent` props or Svelte props. | Hooks/controllers (`useDateTimePanel`, `createDateTimePanel…`) get the overloads. Components type `value` as `PlainDateTime \| ZonedDateTime \| null` (union) and document that the runtime type follows `timeZone`. Add a type test (`tsc` fixture in `tests/types/`) that `useDateTimePanel({ timeZone: "UTC" })` yields `ZonedDateTime`, without one yields `PlainDateTime`. |
| R4 | **`getTimeZoneLabel` support.** `timeZoneName: "shortGeneric"` is missing in some runtimes. | Fallback chain `shortGeneric` → `long` → `short` → the IANA id; never throw. Test with a stubbed `Intl.DateTimeFormat`. |
| R5 | **`checkDateTimeRange` does not exist** (only date and time variants). | Add it in `datetime/constraints.ts`: reasons `start-invalid`, `end-invalid`, `end-before-start`, `too-short`, `too-long`; compares **instants** when zoned, wall times when plain; half-open. Reuse `checkDateRange`/`checkTimeRange` pieces where they fit; do not copy their logic. |
| R6 | **Budgets.** `core/datetime` 6 KB, `<adapter>/datetime` 48 KB, `root` = union. | `check-size` measures `root` as one bundle of **all** exports, so root ≈ the largest entry plus shared code, not the sum: set `root` budgets from `--report` (+15 %) and cap at the sum of subpath ceilings. `core/foundation` stays at the 15 KB ceiling (07 R5); if `getTimeZoneLabel` + `day-instants` do not fit, move `day-instants` into `datetime/`. |
| R7 | **Parity kinds.** | Add `datetime-input`, `datetime-range-input`, `datetime-panel`, `datetime-range-panel` (06 R7). |
| R8 | **Final release.** The publish script already sends plain versions to `latest`. | PR 8 adds the unit test `publishTagFor("0.4.0") === "latest"` (the function from 06 R8) and a test that a prerelease can never go to `latest`. |

### 13.2 Specs the plan leaves open

**Wall → instant resolution (`datetime/zone/resolve.ts`).** One pure function
`resolveWall(wall: PlainDateTime, zone, disambiguation) → { zoned: ZonedDateTime; adjusted: boolean;
ambiguous: boolean }`. `adjusted` = the resolved wall fields differ from `wall` (a gap was crossed);
`ambiguous` = `toZoned(wall, zone, "earlier").offset !== toZoned(wall, zone, "later").offset` (overlap).
With `"reject"` a gap or overlap throws `RangeError` inside; the controller catches it and reports
`validity: "nonexistent-time"` (gap) — an overlap with `"reject"` is **also** `"nonexistent-time"`
(ambiguous); document the label ("ambiguous or skipped time"). Worked cases:

| zone | typed wall time | `compatible` result | `adjusted` | `ambiguous` |
| --- | --- | --- | --- | --- |
| America/New_York | 2026-03-08 02:30 | 03:30 EDT (−04:00) | true | false |
| America/New_York | 2026-11-01 01:30 | 01:30 EDT (−04:00, earlier) | false | true |
| Australia/Lord_Howe | 2026-10-04 02:15 | 02:45 (+11:00) | true | false |
| Australia/Lord_Howe | 2026-04-05 01:45 | 01:45 (+11:00, earlier) | false | true |
| Asia/Ho_Chi_Minh | any | unchanged (+07:00) | false | false |

Display of an adjusted value: the **typed wall time stays in the field** (X3), `data-adjusted` is set on
the root and the segment group, and the label suffix `adjustedTime` is appended to the accessible name.
`valueTimeZone` (X2): `value = withTimeZone(zoned, valueTimeZone)` (same instant); incoming values are
`withTimeZone(display)` before they are shown. `valueTimeZone` without `timeZone` is a `RangeError` at
creation (development) / ignored with a warning (production).

**DST-aware time list (`day-instants.ts`, X4).** Enumerate **wall-aligned** entries, not real-time steps
(real-time steps would shift entries to `:30` on Lord Howe). Algorithm: for each wall time `w` on the day at
multiples of `step` from `00:00` to `24:00` (exclusive): `a = toZoned(w, zone, "earlier")`,
`b = toZoned(w, zone, "later")`. If `a` and `b` are the same instant and `a`'s wall fields equal `w` → one
entry. If they differ in offset and both keep the wall fields → **two entries** (ordinals 1 and 2, keys
`HH:mm` and `HH:mm#2`, each with `offset`). If `a`'s wall fields differ from `w` (gap) → **omit**.
Expected counts for `step 60`: ordinary day 24; New York 2026-03-08: 23 (no 02:00); 2026-11-01: 25 (01:00
twice); Lord Howe `step 30` 2026-10-04: 47 (02:00 and 02:30? the gap is 02:00–02:30, so only 02:00 is
omitted → 47), 2026-04-05: 49 (01:30 twice). Add these as table tests. Entries carry `data-offset` (the
offset in `±HH:mm`). The picked entry sets the **instant** (so the second 01:30 is a different value from
the first). Columns layout cannot show duplicates and uses `disambiguation` (X4).

**Constraints (X5).** Effective `min` = the later of `min` and `now` (when `disablePast`), both converted to
`timeZone`. A day is disabled when `day < min.day` or `day > max.day`. On `min.day` a time is disabled when
`time < min.time`; on `max.day` when `time > max.time`... **half-open vs inclusive**: `max` is inclusive for
picking (a user may pick exactly `max`), `min` is inclusive. Worked example: `min = 2026-11-17T14:30`,
step 15: Nov 16 disabled; Nov 17 times 14:15 and earlier disabled, 14:30 enabled. `disablePast` at
`now = 14:37`: min = 14:37; with step 15 the first enabled time is 14:45 (14:30 < min); an **off-step**
typed 14:40 is `valid` (it is ≥ min) but `off-step` per the Time rules. `isTimeDisabled(time, date)` is
re-evaluated when the date changes; near midnight (`now = 23:50`) `disablePast` disables the whole of
today's remaining step-aligned times except the ones ≥ 23:50.

**Panel state machine (X7, X8).** Internal `{ date: PlainDate | null, time: PlainTime | null }`:

| Event | Result | `onValueChange` | `onValueCommit` |
| --- | --- | --- | --- |
| pick date, no time, `defaultTime` set | date + defaultTime | yes (complete) | **no** |
| pick date, no time, no `defaultTime` | draft date only | **no** (value stays `null`) | no |
| pick time, date chosen | complete value | yes | **yes** when the Time panel commits (T12) |
| pick time, no date | draft time only | no | no |
| pick another date, time set | keep time; re-check X5 | yes if the time stays enabled, else value `null` + the time option marked `data-disabled` | no |
| `clear()` | both `null` | yes | no |

Range panel (X9): internal `{ range: DateRangeDraft, startTime, endTime }`; the value is complete when both
dates and both times exist and `checkDateTimeRange` is valid; commit when the **end time** commits.
End-time options blocked (`data-range-blocked`) when the resulting end instant violates `end > start`,
`minDuration`/`maxDuration` or `max`; evaluated lazily for the visible options only.

**Paste / `parseDateTime`.** Split the pasted text into a date part and a time part: (1) ISO with `T` or a
space between `YYYY-MM-DD` and `HH:mm[:ss]` (with optional offset/`Z`, which is converted to `timeZone`);
(2) otherwise find the **time group**: the trailing tokens that contain `:` or a day period (`am/pm`, localized
names) or the last 1–2 digit token after a date with ≥ 3 tokens; the rest is the date part; parse each with
the Date and Time parsers. Table (`now = 2026-11-17`, `timeZone = "Asia/Ho_Chi_Minh"`):

| locale | input | result |
| --- | --- | --- |
| any | `2026-11-17T09:30` | 2026-11-17 09:30 |
| any | `2026-11-17T09:30:00Z` | 2026-11-17 16:30 (zone applied) |
| en-US | `11/17/2026 9:30 PM` | 2026-11-17 21:30 |
| en-GB | `17/11/2026 21:30` | 2026-11-17 21:30 |
| vi-VN | `17/11/2026 9:30` | 2026-11-17 09:30 |
| en-US | `Nov 17, 2026 9:30` | 2026-11-17 09:30 |
| en-US | `11/17/2026` | `{ date, time: null }` (fills the date field only) |
| en-US | `9:30` | `{ date: null, time }` (fills the time field only) |

### 13.3 Test-support additions

- `packages/core/tests/fixtures/datetime-resolve.json` (the resolution table), `day-instants.json` (counts and
  the offset sequence for each DST day) and `datetime-parse.json` (the paste table). Hand-written.
- `datetime/no-duplication.test.ts` (static): read every `.ts` under `packages/core/src/datetime/` and assert
  (a) every non-relative-within-`datetime` import resolves into `date/`, `time/` or `foundation/`; (b) no
  file declares `createSegmentEngine`, `tokenize`, `parseDate`, `parseTime` or `createSingleSelection`-style
  helpers (list the forbidden identifiers in the test); (c) combined controller files stay thin (a line
  budget per file, e.g. ≤ 250) so logic is delegated rather than copied.
- Adapter tests: `datetime-compose` renders a `DatePanelGrid` inside `DateTimePanelDate` and a
  `TimePanelColumn` inside `DateTimePanelTime` and compares the DOM with the standalone panels (same
  attributes except the root).
- Use the 06/07 fixtures for Date/Time pieces; do not duplicate their cases here.

### 13.4 PR task list

| PR | Files | Done when |
| --- | --- | --- |
| 1 | `datetime/zone/{resolve,day-instants}.ts`, `constraints.ts` (+ `checkDateTimeRange`), `getTimeZoneLabel` | resolve/day-instants/constraint fixtures green in all four zones; foundation budget re-measured |
| 2 | `datetime/panel/{controller,range-controller}.ts`, attribute additions (`data-adjusted`, `data-offset`) | state-machine table tests; X9 blocked ends |
| 3 | `datetime/input/*`, `./datetime` core export, no-duplication test, type test (R3) | parse table, validity incl. `nonexistent-time`; `check:domains` shows `datetime → date, time` only |
| 4 | React `/datetime`, `shared/input/segment.*` move, internal context reuse (R2) | `/date` and `/time` parity snapshots **unchanged**; new datetime scenarios stored and reviewed |
| 5–7 | Vue, Svelte, Vanilla (+ `initDateTimeElements`) | per-adapter suites + parity |
| 8 | Examples (scheduler, check-in/out, DST demo), recipes, docs, `0.4.0` | all 4 subpaths in `entries.test.ts`; `publishTagFor` tests; READMEs updated incl. the "which component do I need" table |

### 13.5 Pitfalls checklist

- Never convert through `Date`; use foundation zoned functions (`toZoned`, `fromInstant`, `withTimeZone`).
- The host time zone must not influence anything: run the suite under all four `TZ` values and pass explicit
  `timeZone` in every test.
- A DST demo test needs `now` injected; do not read the clock.
- The same wall time can map to two instants: use the instant (or the `#2` key) as identity for list options,
  never the `HH:mm` string alone.
- When the date changes and the selected time becomes disabled, **do not** silently move it (06 A11 principle).
- `DateTimeInputTimeZone` is informational; it must not be `aria-hidden`.
- Keep Date/Time attribute contracts untouched inside the containers (parity guards it); only the root adds
  `data-chrono-datetime-panel` and `data-adjusted`.
