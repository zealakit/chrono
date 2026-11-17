# Plan: stage 1 — Foundation (`@zealakit/chrono-core/foundation`) — part 1 of 3

> Part 1 of 3 of [`03-foundation.md`](03-foundation.md) (the index: scope, status and the part table). Section numbers (`§N`) are unchanged by the split. Shared rules: [`00-conventions-as-built.md`](00-conventions-as-built.md).

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
