# Plan: stage 4c — DateTime domain (`/datetime`) — part 3 of 3

> Part 3 of 3 of [`08-datetime.md`](08-datetime.md) (the index: scope, status and the part table). Section numbers (`§N`) are unchanged by the split. Shared rules: [`00-conventions-as-built.md`](00-conventions-as-built.md).

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
