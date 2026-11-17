# @zealakit/chrono-core

[English](https://github.com/zealakit/chrono/blob/main/packages/core/README.md) | [Tiếng Việt](https://github.com/zealakit/chrono/blob/main/packages/core/README_VI.md) | [中文](https://github.com/zealakit/chrono/blob/main/packages/core/README_CN.md)

![Zealakit Chrono cover](https://github.com/zealakit/chrono/blob/main/assets/images/chrono-cover.jpg?raw=true)

Internal calendar and date/time kernel for every Zealakit Chrono adapter. Core is private and never published to npm: every adapter bundles its own copy, so application code uses the adapter for its framework. This reference is for contributors working inside the monorepo.

Core renders nothing, ships no CSS, and has no runtime dependencies.

> **Note**
> Chrono is a focused, headless set of Calendar views and, in later releases, Date, Time and DateTime components. It ships no CSS and renders no styled markup, so you keep full control of the visuals. Release 0.2.0 has the Calendar views and the Mini Calendar. Events, date and time inputs and panels are not implemented yet.
>
> Chrono is not a full UI library or design system, and it ships no popup, overlay, or positioning code. Put its panels inside your own popup when you need one.

## Install

```bash
pnpm --filter @zealakit/chrono-core run build
```

Core is not on npm, so it cannot be installed. It is built inside the workspace and, at release time, copied into each adapter tarball under `dist/vendor/core`.

## Public API

Core exposes the `.` entry (a re-export of every domain), `./foundation` and `./calendar`. The Calendar domain imports only the foundation. Adapters import the matching subpaths.

| Module | Folder | Contents |
| --- | --- | --- |
| `values` | `foundation/values/` | `PlainDate`, `PlainTime`, `PlainDateTime`, `ZonedDateTime`; epoch-day math, arithmetic, boundaries, compare, ISO 8601, `Date` conversion, `today()` and `nowZoned()`. |
| `locale` | `foundation/locale/` | `Intl` wrappers: week info with a CLDR fallback table, month and weekday names, hour cycle, text direction, formatting, date part order. |
| `constraints` | `foundation/constraints/` | `getDateStatus`, `getTimeStatus`, `snapTime`, `checkDateRange`, `checkTimeRange`, `createAvailability`. |
| `ranges` | `foundation/ranges/` | Inclusive date ranges, half-open intervals, `splitIntervalByDay`. |
| `grid` | `foundation/grid/` | `getMonthGrid`, `getMonths`, `getYearGrid`, `getDecadeGrid`, `getWeekdayHeaders`, `getTimeAxis`. |
| `a11y` | `foundation/a11y/` | Pure `nextFocusedDate`, date and time labels, default English messages. |
| `store` | `foundation/store/` | `createStore`, `createControllable`, `getGlobalState`, `isBrowser`. |
| `calendar` | `calendar/` | View definitions, range, navigation and title functions, month, time-grid, list and Mini Calendar layouts, `createCalendarController`, `createMiniCalendarController`. |

## Conventions

- Months are 1-based and Monday is 1. Week rules come from `Intl` with a built-in fallback.
- Values are frozen plain objects handled by free functions. There are no classes.
- Date ranges are inclusive. Date-time intervals are half-open.
- No function in `values/` uses the host time zone. Pass `timeZone`, `now` and `locale` explicitly, especially for SSR.
- Only English state words ship (`today`, `selected`, ...). Apps translate by passing `messages`.
- `pnpm check:domains` enforces which folder may import which. The core suite runs once per time zone and needs full ICU.

## License

MIT © Zealakit
