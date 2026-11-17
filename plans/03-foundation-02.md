# Plan: stage 1 — Foundation (`@zealakit/chrono-core/foundation`) — part 2 of 3

> Part 2 of 3 of [`03-foundation.md`](03-foundation.md) (the index: scope, status and the part table). Section numbers (`§N`) are unchanged by the split. Shared rules: [`00-conventions-as-built.md`](00-conventions-as-built.md).

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
