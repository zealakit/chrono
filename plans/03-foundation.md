# Plan: stage 1 — Foundation (`@zealakit/chrono-core/foundation`)

Status: **proposal — not implemented**.

Order: **3 of N**. Runs after `01-create-src.md` (skeleton green). Implements stage 1 of
`02-implement-business-flow.md` §9. The next plan is `04-calendar-views.md` (stage 2).

Goal: build the shared, framework-free base that every domain (Calendar, Date, Time,
DateTime) uses: value types, locale, constraints, ranges, grids, keyboard navigation, the
controller store and the domain boundary check. All of it lives in the private core package.

**Scope rule:**
- Core only. **No adapter gets a new export** in this stage, because no domain has a
  component yet (02 §2.7: entries are added only when they have content). Adapter READMEs keep
  "No public API yet."
- No `date/`, `time/`, `datetime/`, `calendar/` folders yet. Only `foundation/`.
- Every function listed here is needed by stage 2 or stage 4 (02 §2.1 limit: no date-fns
  replacement). If a function has no named consumer in 02's flows, it is cut.

Signatures below are **shapes**, written as TypeScript types so they are exact. They are the
spec, not the code.

---

## 1. Decisions taken in this plan

| # | Topic | Decision | Why |
| --- | --- | --- | --- |
| D1 | Value representation | Plain, frozen objects + free functions (`addDays(date, 1)`), no classes, no methods | Works across copies of core (02 §2.7), JSON-friendly, safe inside Vue/Svelte reactive proxies (classes with private fields break there), tree-shakes per function |
| D2 | Field conventions | Follow Temporal: `month` 1–12, `day` 1–31, `dayOfWeek` 1 = Monday … 7 = Sunday. `weekStartsOn` uses the same 1–7 numbers | Same as `Intl.Locale` week info and Temporal. No 0-based month bugs |
| D3 | Supported years | 1–9999, proleptic Gregorian | Matches ISO 8601 4-digit years. Out-of-range input is rejected |
| D4 | Date arithmetic | Epoch-day integer (days since 1970-01-01) using the "days from civil" algorithm. Never `Date` for plain dates | No DST or local-time effects. Fast. Easy to test against `Date.UTC` as an oracle |
| D5 | Month/year overflow | `addMonths(2026-01-31, 1)` → `2026-02-28` (Temporal `"constrain"`). Option `overflow: "reject"` throws instead | The behavior users expect from calendar UIs |
| D6 | Time precision | `PlainTime` is `{ hour, minute, second }`. No milliseconds | Inputs and panels go down to seconds at most. Events compare via epoch milliseconds, which the zoned layer handles |
| D7 | Zoned values | `ZonedDateTime` = `PlainDateTime` + `timeZone` (IANA id) + `offset` (minutes east of UTC). Conversion via a cached `Intl.DateTimeFormat` per zone | No tz database shipped (02 §2.1). Minutes cover every modern zone (incl. +05:45, Lord Howe +10:30/+11) |
| D8 | DST disambiguation | `"compatible"` (default) / `"earlier"` / `"later"` / `"reject"`, same meaning as Temporal | Needed by DateTime (F17) and time-grid layout (F4). Same names as Temporal keep a future switch cheap |
| D9 | Ranges | **Date ranges are inclusive** `[start, end]` (picker semantics). **Date-time intervals are half-open** `[start, end)` (event semantics). All-day **event** data is half-open too: exclusive end date (plan 05 E3) | Matches how users read a picked range and how events butt against each other |
| D10 | "Today" and "now" | Never read the clock implicitly inside pure functions. `today(timeZone, now?)` / `nowZoned(timeZone, now?)` take an optional `now` (epoch ms) | SSR: the server and client can pass the same `now` to avoid hydration mismatch (02 §7) |
| D11 | Default locale | `undefined` locale means the runtime default (`new Intl.DateTimeFormat().resolvedOptions().locale`). Docs tell SSR apps to pass `locale` explicitly | Server and browser defaults differ |
| D12 | Week info source | `Intl.Locale#getWeekInfo()`, then the older `weekInfo` getter, then a small built-in region table (first day, weekend, minimal days) | Not every supported runtime exposes week info yet |
| D13 | Accessible label text | Dates and times are labelled with `Intl`. State words ("selected", "unavailable", "today") come from an English `messages` object that each component can override through props. **Only English ships** (decided); other languages come from app overrides | No Provider (02 §2.5). `Intl` has no words for UI states |
| D14 | Disabled vs unavailable | Two separate statuses with the same selectability: `disabled` (outside min/max or app-disabled) and `unavailable` (exists but taken, e.g. booked). Both are not selectable; both stay focusable (APG) | Different styling (`data-disabled` vs `data-unavailable`) and different range rules (F13 "unavailable inside range") |
| D15 | Domain check | A dependency-free script that walks import graphs with a small regex parser. No Biome rule | Must check `dist` (JS) too, not only source. Biome's restricted imports only see source paths |

---

## 2. File layout

```text
packages/core/
├── package.json             # exports: ".", "./foundation", "./package.json"
├── src/
│   ├── index.ts             # export * from "./foundation/index.js"
│   └── foundation/
│       ├── index.ts         # public foundation surface (only re-exports)
│       ├── values/
│       │   ├── types.ts         # PlainDate, PlainTime, PlainDateTime, ZonedDateTime, DayOfWeek…
│       │   ├── epoch-day.ts     # days-from-civil / civil-from-days, isLeapYear, daysInMonth
│       │   ├── plain-date.ts    # create, validate, add/subtract, start/end of week/month/year
│       │   ├── plain-time.ts    # create, validate, add, compare, to/from seconds of day
│       │   ├── plain-date-time.ts
│       │   ├── zoned.ts         # offsets, instant ↔ wall time, disambiguation
│       │   ├── compare.ts       # compare/isSame*/isBefore/isAfter/min/max for all types
│       │   ├── week.ts          # dayOfWeek, ISO week, locale week number
│       │   ├── iso.ts           # ISO 8601 parse + serialize (no locale parsing here)
│       │   ├── convert.ts       # from/to Date, from Temporal-like objects, toValue(input)
│       │   └── clock.ts         # today(), nowZoned() with injectable `now`
│       ├── locale/
│       │   ├── resolve.ts       # resolveLocale(), formatter cache
│       │   ├── week-info.ts     # getWeekInfo() + region fallback table
│       │   ├── names.ts         # month and weekday names
│       │   ├── hour-cycle.ts    # getHourCycle()
│       │   ├── direction.ts     # getTextDirection() (ltr/rtl)
│       │   └── format.ts        # formatDate/Time/DateTime/Range (thin Intl wrappers)
│       ├── constraints/
│       │   ├── date.ts          # getDateStatus(), isDateSelectable()
│       │   ├── time.ts          # getTimeStatus(), snapTime()
│       │   ├── range.ts         # checkDateRange(), checkTimeRange()
│       │   └── availability.ts  # createAvailability(spec) → fast predicate
│       ├── ranges/
│       │   ├── date-range.ts    # inclusive date ranges
│       │   └── interval.ts      # half-open date-time intervals, split by day
│       ├── grid/
│       │   ├── month-grid.ts    # getMonthGrid(), getMonths() (multi-month)
│       │   ├── year-grid.ts     # getYearGrid(), getDecadeGrid()
│       │   ├── weekday-headers.ts
│       │   └── time-axis.ts     # getTimeAxis()
│       ├── a11y/
│       │   ├── grid-navigation.ts  # pure key → next focused value
│       │   ├── labels.ts           # cell/time labels from Intl + messages
│       │   └── messages.ts         # default English messages + merge helper
│       └── store/
│           ├── store.ts            # createStore(): get / set / subscribe
│           ├── controllable.ts     # createControllable(): controlled/uncontrolled value
│           ├── global-state.ts     # getGlobalState() (Overlay's, Chrono key)
│           └── env.ts              # isBrowser()
└── tests/                         # one test file per module, see §5
scripts/
└── check-domains.mjs             # domain import-graph check, see §4
```

`foundation/index.ts` re-exports the public functions and types listed in §3. Internal
helpers (formatter cache, region table) are not re-exported.

---

## 3. Module specs

### 3.1 `values/`

Types:

```ts
type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;           // 1 = Monday
type PlainDate = Readonly<{ calendar: "gregory"; year: number; month: number; day: number }>;
type PlainTime = Readonly<{ hour: number; minute: number; second: number }>;
type PlainDateTime = Readonly<PlainDate & PlainTime>;
type ZonedDateTime = Readonly<PlainDateTime & { timeZone: string; offset: number }>;
type Disambiguation = "compatible" | "earlier" | "later" | "reject";
type DateInput = PlainDate | string | Date;             // what public props accept
type TimeInput = PlainTime | string;
```

`calendar` is always `"gregory"` in v1. It is the slot that keeps other calendars possible
later (02 §2.1).

Functions (grouped):

| Group | Functions | Notes |
| --- | --- | --- |
| Create / validate | `plainDate(y, m, d, opts?)`, `plainTime(h, mi, s?)`, `plainDateTime(date, time)`, `isValidDate(y, m, d)` | Invalid → `RangeError` with a clear message. Results are frozen |
| Calendar facts | `isLeapYear`, `daysInMonth`, `daysInYear`, `dayOfWeek`, `dayOfYear` | |
| Epoch day | `toEpochDay(date)`, `fromEpochDay(n)` | Internal base of all date math. Exported because grids and layout need it |
| Date arithmetic | `addDays`, `addWeeks`, `addMonths`, `addYears` (`overflow` option, D5), `diffDays(a, b)` | Negative amounts subtract. No separate `subtract*` |
| Boundaries | `startOfWeek(date, weekStartsOn)`, `endOfWeek`, `startOfMonth`, `endOfMonth`, `startOfYear`, `endOfYear` | |
| Time arithmetic | `addMinutes(time, n)` and `addSeconds` (wrap at midnight, returns `{ time, dayDelta }`), `toSecondOfDay`, `fromSecondOfDay` | `dayDelta` lets DateTime carry into the date |
| Compare | `compare(a, b)` (−1/0/1, overloaded per type), `isSameDay`, `isSameMonth`, `isSameYear`, `isSameTime`, `isBefore`, `isAfter`, `minValue`, `maxValue` | Works on each type; mixing types is a type error |
| Weeks | `getIsoWeek(date)` → `{ year, week }`, `getLocaleWeek(date, weekInfo)` | ISO vs locale rules (first day + minimal days) |
| Zoned | `getOffset(epochMs, timeZone)`, `toZoned(dateTime, timeZone, disambiguation?)`, `fromInstant(epochMs, timeZone)`, `toInstant(zoned)` → epoch ms, `withTimeZone(zoned, timeZone)`, `isValidTimeZone(id)` | Gaps: `"compatible"` moves forward by the gap length. Overlaps: `"compatible"` picks the earlier offset. `"reject"` throws |
| ISO | `parseIsoDate`, `parseIsoTime`, `parseIsoDateTime`, `parseIsoZoned` (accepts `±hh:mm` and `[Zone/Id]`), `toIsoString(value)` | Strict: anything that is not ISO is rejected here. Locale-aware text parsing belongs to `date/input` / `time/input` (stage 4) |
| Convert | `toPlainDate(input: DateInput, timeZone?)`, `toPlainTime(input)`, `fromDate(date, timeZone?)`, `toDate(value, timeZone?)`, `fromTemporalLike(obj)` | `fromTemporalLike` duck-types `year/month/day/...` fields and `timeZoneId`. No Temporal import, no polyfill |
| Clock | `today(timeZone?, now?)`, `nowZoned(timeZone, now?)` | Only place that reads `Date.now()`, and only when `now` is not given (D10) |

Rule: no function in `values/` uses the host's local time zone. `Date` is only touched in
`convert.ts` and `clock.ts`, always through UTC getters or an explicit `timeZone`.

### 3.2 `locale/`

| Function | Returns | Source |
| --- | --- | --- |
| `resolveLocale(locale?)` | canonical BCP 47 string | `Intl.getCanonicalLocales`, default per D11 |
| `getWeekInfo(locale?)` | `{ firstDay: DayOfWeek; weekend: DayOfWeek[]; minimalDays: 1–7 }` | D12 |
| `getMonthNames(locale?, width)` | 12 strings, `width: "long" \| "short" \| "narrow"` | `Intl.DateTimeFormat` on fixed UTC dates |
| `getWeekdayNames(locale?, width, firstDay?)` | 7 strings, starting at `firstDay` | same |
| `getHourCycle(locale?)` | `"h12" \| "h23"` (`h11`/`h24` folded into these) | `resolvedOptions().hourCycle` |
| `getDayPeriodNames(locale?)` | `{ am, pm }` | `formatToParts` |
| `getTextDirection(locale?)` | `"ltr" \| "rtl"` | `Intl.Locale#getTextInfo()` / `textInfo`, fallback list of RTL scripts |
| `formatDate(date, locale?, options?)`, `formatTime`, `formatDateTime`, `formatDateRange` | string | `Intl.DateTimeFormat` / `formatRange`. Plain values are formatted as UTC with `timeZone: "UTC"`, so the host zone never shifts the result |
| `getDatePartOrder(locale?)` | e.g. `["day", "month", "year"]` + separators | `formatToParts`. Needed by segmented inputs (stage 4) and placeholders |

All `Intl.DateTimeFormat` instances are cached per `locale + options` key (internal module,
plain `Map`, created lazily — no work at import time).

Region fallback table (D12): first day, weekend days and minimal days for the regions whose
value differs from the default (Monday / Sat–Sun / 1), taken from CLDR `weekData`. Kept
under ~1 KB. A test compares the table with `getWeekInfo()` output on runtimes that support
it, so drift is caught.

### 3.3 `constraints/`

```ts
type DateConstraints = {
  min?: PlainDate; max?: PlainDate;
  isDateDisabled?: (date: PlainDate) => boolean;
  isDateUnavailable?: (date: PlainDate) => boolean;
};
type DateStatus = {
  selectable: boolean;
  disabled: boolean;
  unavailable: boolean;
  reason?: "before-min" | "after-max" | "disabled" | "unavailable";
};
type TimeConstraints = {
  min?: PlainTime; max?: PlainTime;
  step?: { minutes?: number; seconds?: number };
  disabledRanges?: readonly { start: PlainTime; end: PlainTime }[];   // half-open
  isTimeDisabled?: (time: PlainTime) => boolean;
};
```

| Function | Behavior |
| --- | --- |
| `getDateStatus(date, constraints)` | Order: min → max → `isDateDisabled` → `isDateUnavailable`. First hit wins and sets `reason` |
| `isDateSelectable(date, constraints)` | `getDateStatus(...).selectable` |
| `getTimeStatus(time, constraints)` | min/max, step alignment, disabled ranges, predicate |
| `snapTime(time, step, mode)` | `mode: "nearest" \| "floor" \| "ceil"` |
| `checkDateRange(range, constraints & { minDays?, maxDays?, allowUnavailableInside?, allowDisabledInside? })` | `{ valid: true } \| { valid: false; reason: "start-invalid" \| "end-invalid" \| "too-short" \| "too-long" \| "contains-unavailable" \| "contains-disabled" }`. Inside-range scan uses `availability` intervals when possible, not a day-by-day loop |
| `checkTimeRange(range, constraints & { minDuration?, maxDuration?, allowOvernight? })` | Same result shape, time reasons |
| `createAvailability(spec)` | **Superseded by plan 11 V1–V4** (open/blocked rules with times, zones and resources; this date-only shape is deprecated there). Stage-1 version: compiles data into a predicate: `{ dates?: PlainDate[]; ranges?: DateRange[]; weekdays?: DayOfWeek[]; mode: "available" \| "blocked" }`. Dates → `Set` of epoch days, ranges → sorted, merged intervals with binary search. Returns `{ isAvailable(date), nextAvailable(date, direction) }` |

`nextAvailable` is what keyboard navigation and range checks use to skip blocked runs quickly.

### 3.4 `ranges/`

| Type / function | Notes |
| --- | --- |
| `DateRange = { start: PlainDate; end: PlainDate }` | Inclusive (D9) |
| `normalizeDateRange(a, b)` | Swaps so `start ≤ end` (F13 auto-swap) |
| `isDateInRange`, `dateRangeLength` (days, inclusive), `dateRangesOverlap`, `intersectDateRanges`, `clampDate(date, range)`, `eachDay(range)` (generator) | |
| `Interval = { start: ZonedDateTime \| PlainDateTime; end: … }` | Half-open (D9) |
| `intervalsOverlap`, `intervalDuration` (ms or minutes for plain), `splitIntervalByDay(interval, timeZone?)` | `splitIntervalByDay` returns per-day pieces with `continuesBefore` / `continuesAfter`. It handles 23/25-hour days. Used by stage 3 event layout and by DateTime ranges |

### 3.5 `grid/`

```ts
type GridDay = {
  date: PlainDate;
  dayOfWeek: DayOfWeek;
  outsideMonth: boolean;
  weekend: boolean;
  today: boolean;               // only when `today` is passed in options
};
type MonthGrid = {
  year: number; month: number;
  weeks: { weekNumber: number; days: GridDay[] }[];
};
```

| Function | Notes |
| --- | --- |
| `getMonthGrid(year, month, { weekStartsOn, weekInfo?, fixedWeeks?, today?, weekNumbers?: "iso" \| "locale" })` | `fixedWeeks: true` always gives 6 rows (stable height). Adjacent-month days are always included and flagged. The consumer hides them if it wants |
| `getMonths(start, count, options)` | Multi-month: `count` consecutive month grids (range pickers, multi-month view) |
| `getYearGrid(year, { columns? })` | 12 months as cells (month level of a panel) |
| `getDecadeGrid(year, { size? })` | Years around `year` (year level of a panel) |
| `getWeekdayHeaders(locale?, { weekStartsOn, hiddenDays?, width })` | `{ dayOfWeek, short, long, weekend }[]`. `hiddenDays` gives work-week headers |
| `getTimeAxis({ start, end, step, workingHours? })` | Wall-time slots `{ index, start: PlainTime, end: PlainTime, working: boolean }`. DST handling happens at layout time in stage 3, where real days are known |

Performance target (02 §7): `getMonthGrid` < 1 ms. Measured in a benchmark test (§5),
reported only.

### 3.6 `a11y/`

`grid-navigation.ts` is **pure**: it maps a key to the next focus target and never touches
the DOM. DOM focus and roving `tabindex` are applied by the controllers in stages 2 and 4.

```ts
type GridNavKey = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown"
                | "Home" | "End" | "PageUp" | "PageDown";
type GridNavContext = {
  weekStartsOn: DayOfWeek;
  direction: "ltr" | "rtl";
  min?: PlainDate; max?: PlainDate;
  level: "day" | "month" | "year";
};
function nextFocusedDate(current: PlainDate, key: GridNavKey,
                         modifiers: { shift: boolean }, ctx: GridNavContext): PlainDate;
```

| Key (day level) | Moves to |
| --- | --- |
| ←/→ | −/+1 day (swapped under `rtl`) |
| ↑/↓ | −/+7 days |
| Home/End | start/end of the week (`weekStartsOn`) |
| PageUp/PageDown | −/+1 month (day clamped, D5) |
| Shift+PageUp/PageDown | −/+1 year |

Month and year levels use the same keys over their own grids. Results are clamped to
`min`/`max`. Disabled dates are **not** skipped: they stay focusable (APG, D14).

`labels.ts`: `getDateLabel(date, locale, status, messages)` → e.g.
"Tuesday, November 17, 2026, today, selected". `getTimeLabel`, `getRangeLabel` likewise.

`messages.ts`: default English messages (`today`, `selected`, `unavailable`, `disabled`,
`rangeStart`, `rangeEnd`, `inRange`) plus `mergeMessages(defaults, overrides)`.

The live-region announcer is **not** in this stage. It arrives with the first flow that
announces something (F6 / F7, stages 3 and 5).

### 3.7 `store/`

| Piece | Spec |
| --- | --- |
| `createStore(initial)` | `{ get(), set(partial \| updater), subscribe(listener) → unsubscribe }`. Synchronous. Skips notify when nothing changed (shallow compare) |
| `createControllable({ value?, defaultValue, onChange?, equals })` | Implements 02 §2.3. Controlled when `value !== undefined`: internal state never diverges, `set()` only calls `onChange`. Uncontrolled: stores the value and calls `onChange`. `equals` per value type (`isSameDay` …) avoids change events for equal values |
| `getGlobalState(name, create)` | Copied from Overlay, key `@zealakit/chrono-core/v1/<name>` |
| `isBrowser()` | `typeof window !== "undefined" && typeof document !== "undefined"` |

Adapters (React `useSyncExternalStore`, Vue `shallowRef`, Svelte runes) bind to `createStore`
in later stages. Nothing here knows a framework.

---

## 4. Domain boundary check (`scripts/check-domains.mjs`)

Implements 02 §2.6–§2.7 and §8.

- **Inputs:** `packages/core/src`, `packages/core/dist`, and each adapter's `src` and `dist`.
- **Parsing:** regex over `import … from "x"`, `export … from "x"`, `import("x")` and
  side-effect `import "x"`. Resolves relative specifiers (`.js` → `.ts` for source) and
  `@zealakit/chrono-core/<sub>`. No dependencies.
- **Rules** (a folder may import only the folders on its row):

  | From | May import |
  | --- | --- |
  | `foundation/` | `foundation/` |
  | `date/` | `foundation/`, `date/` |
  | `time/` | `foundation/`, `time/` |
  | `datetime/` | `foundation/`, `date/`, `time/`, `datetime/` |
  | `calendar/` | `foundation/`, `date/`, `time/`, `calendar/` |
  | adapter `src/<domain>/` | the same domains (adapter + core subpaths), plus adapter `shared/` |
  | anything | never the package's own root `index` |

- **Reachability mode** (for `dist`): from each entry (`index.js`, later `<domain>/index.js`)
  walk the graph and fail when a forbidden folder is reachable. This is the "importing only
  `/time` bundles no Date code" guarantee (02 §7).
- **Cycles:** report any import cycle inside a package (02 §2.7 "no circular imports").
- **Output:** one line per violation `file → specifier (rule)`, exit code 1.
- **Wiring:** root script `check:domains`, run by `pnpm check` and `pnpm release:check`.
- **Its own tests:** `scripts/tests/check-domains.test.mjs` with tiny fixture trees (allowed
  import, forbidden import, cycle, root-index import). Today only `foundation/` exists, so the
  fixtures are what prove the rules work.

The root-vs-subpath export-name test (02 §8) needs subpaths, so it lands in stage 2.

---

## 5. Tests

Harness from plan 01: `node:test` + `node:assert/strict`, tests import `../dist/…`.

**Time zone matrix.** Core's `test` script runs the whole suite once per zone:
`UTC`, `America/New_York`, `Asia/Ho_Chi_Minh`, `Australia/Lord_Howe`. A tiny runner
(`packages/core/scripts/test-tz.mjs`) spawns `node --test` with `TZ` set and fails if any run
fails. Plain-date results must be identical in every zone. That proves no local-time leak.

| Test file | What it proves |
| --- | --- |
| `epoch-day.test.ts` | Round trip `fromEpochDay(toEpochDay(d)) = d` for **every day 0001-01-01 … 9999-12-31** (≈3.65 M checks, still < 1 s), and equality with `Date.UTC` as an oracle for 1900–2100 |
| `plain-date.test.ts` | Leap years (1900, 2000, 2024, 2100), month-end overflow (D5) incl. Feb 29 + 1 year, negative amounts, year bounds (D3), frozen results, invalid input errors |
| `plain-time.test.ts` | Wrap at midnight with `dayDelta`, seconds of day round trip |
| `week.test.ts` | ISO week 53 years (2020, 2026), week 1 starting in December, locale weeks for `en-US`, `de-DE`, `ar-EG` (Saturday start), `he-IL` |
| `zoned.test.ts` | Every 2026 DST transition in New York and Lord Howe (30-min shift), gap + overlap with all four disambiguations, Ho Chi Minh (no DST), `isValidTimeZone` |
| `iso.test.ts` | Valid/invalid ISO forms, round trip `parse(toIsoString(x)) = x`, offsets and `[Zone]` suffix |
| `convert.test.ts` | `Date` ↔ plain values under every `TZ`, Temporal-like duck typing |
| `clock.test.ts` | `today()` with injected `now` near midnight in different zones |
| `locale.test.ts` | Week info for `en-US`, `en-GB`, `vi-VN`, `zh-CN`, `ar-EG`, `fa-IR`. Fallback table agrees with `Intl` where available. Month/weekday names, hour cycle (`en-US` h12, `vi-VN` h23), RTL detection, date part order (`en-US` M/D/Y, `vi-VN` D/M/Y, `zh-CN` Y/M/D) |
| `format.test.ts` | Plain values format the same in every `TZ` (no shift) |
| `constraints.test.ts` | Status order and reasons, range checks with every reason, time step/snap, `createAvailability` vs a brute-force day loop on random data (seeded generator, no library) |
| `ranges.test.ts` | Inclusive vs half-open edges, `splitIntervalByDay` across midnight and across DST days |
| `grid.test.ts` | Month grids for all 7 `weekStartsOn` values, `fixedWeeks`, Feb in leap/non-leap years, week numbers, multi-month continuity, year/decade grids, time axis with step 15/30/60 and working hours |
| `grid-navigation.test.ts` | Every key at day/month/year level, `rtl` swap, clamping at min/max, disabled dates not skipped |
| `labels.test.ts` | Label text for `en-US` with each status, message overrides |
| `store.test.ts` | Notify/skip, controlled vs uncontrolled, `equals` suppresses events |
| `global-state.test.ts` | Two module copies share state through the `Symbol.for` key |
| `bench.test.ts` | `getMonthGrid` < 1 ms (median of 1,000), `createAvailability` lookups. Prints results, does not fail CI (02 §7) |

Tests require full ICU (Node's default build). The runner fails early with a clear message if
`Intl` reports a small-ICU build.

---

## 6. Packaging and size

- Core `package.json` gains the `./foundation` export
  (`{ types, import, default }` → `dist/foundation/index.js`). Root `.` re-exports it.
- `scripts/bundle-core.mjs` already rewrites `@zealakit/chrono-core/<sub>` (plan 01 §4.4).
  `pnpm pack:packages` must still pass. Adapters import nothing from core yet, so the tarballs
  only prove the vendoring path.
- Size budget (report only, via `node:zlib` gzip over `dist/foundation/**/*.js`): **≤ 10 KB
  gzip** for the whole foundation. The monitor shows it. Stage 2 can tighten it.
- `sideEffects: false` stays. A test imports `dist/foundation/index.js` and asserts no global
  was created and no `Intl` formatter was built at import time.

---

## 7. Docs and agent files

- `packages/core/README{,_VI,_CN}.md` — internal module map for contributors (foundation
  folders, conventions D1–D15). Still states core is internal and never installed directly.
- Adapter READMEs, root README, `skills/chrono-*.md` — unchanged (no public API yet).
- `.agents/AGENTS.md` — add `pnpm check:domains` to Commands and the folder rules table (§4)
  to Hard boundaries. Add the conventions: 1-based months, Monday = 1, inclusive date ranges vs
  half-open intervals, no local time zone in `values/`, `now`/`locale` injection.
- `.agents/skills/chrono/SKILL.md` — foundation map and "where does new logic go" rules.

---

## 8. Delivery (PR breakdown)

Each PR keeps `pnpm check` green.

| PR | Content |
| --- | --- |
| 1 | `values/` (types, epoch day, plain date/time/date-time, compare, week, ISO, convert, clock) + tests + TZ-matrix runner |
| 2 | `values/zoned.ts` + zoned tests |
| 3 | `locale/` + tests |
| 4 | `ranges/` + `constraints/` + tests |
| 5 | `grid/` + `a11y/` + tests + benchmark |
| 6 | `store/` + tests, `check-domains.mjs` + fixtures, `./foundation` export, docs and agent files. Version bump to `0.1.0` on all packages (no publish) |

Commit style follows the repo (e.g. `feat(core): add plain date values`). Work happens on a
branch, not on `main`.

---

## 9. Definition of done

- `pnpm build`, `pnpm typecheck`, `pnpm test` (core under all four zones), `pnpm lint`,
  `pnpm check:deps` (core still has zero runtime dependencies, 02 §2.8), `pnpm check:domains`, `pnpm readme:check`, `pnpm pack:packages` all exit 0.
- Every function in §3 has tests. No function exists that §3 does not list.
- No file under `foundation/values` references the host's local time zone (checked by a test
  that greps `dist/foundation/values` for `getHours(`, `getDate(`, `getMonth(`,
  `getFullYear(`, `getDay(` and `setHours(` — only UTC getters are allowed).
- Benchmark and size numbers are recorded in the stage-1 PR description.
- No adapter export changed.

---

## 10. Out of scope (later stages)

- Domain folders and anything that renders: calendar navigation and views (stage 2), event
  layout (stage 3), Inputs and Panels (stage 4).
- Locale-aware **text** parsing for `text` mode inputs (02 §2.2a) — `date/input`,
  `time/input`, stage 4. Foundation only exposes `getDatePartOrder()` and strict ISO parsing.
- Live-region announcer, DOM focus management, pointer handling.
- Recurrence rules (stage 5).
- Non-Gregorian calendars (02 §2.1).

---

## 11. Open questions

1. ~~**Translated a11y messages**~~ — **decided: English defaults only.** Apps translate by
   passing `messages` overrides per component (D13). No VI/CN message sets in core.
2. ~~**Size budget**~~ — **decided: report only** in stage 1. `04-calendar-views.md` sets a
   hard CI gate once real bundle numbers exist.

All open questions are decided.
