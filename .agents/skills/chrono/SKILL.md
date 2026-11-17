---
name: chrono-architecture
description: >-
  Use for any Zealakit Chrono code, test, documentation, or release work:
  deciding where logic belongs, keeping Core, domains and adapters separated,
  validating behavior, and packaging releases.
---

# Zealakit Chrono

Read `.agents/AGENTS.md` first, then the plan for the stage you are working on (`plans/`).
Keep this file compact. It holds no API content: the public API is defined by the stage plans
and documented in the package READMEs.

## Map

```text
vanilla ─┐
react ───┤
vue ─────┼──> @zealakit/chrono-core   (private, bundled into each adapter at pack time)
svelte ──┘

examples/* -> adapters
READMEs (EN/VI/CN) -> product documentation
```

- **Core** (`packages/core`) owns everything framework-independent: value types, date/time
  arithmetic, locale formatting, calendar grids, time axes, range and selection state, keyboard
  grid navigation, and the controller/store base.
- **Adapters** own framework lifecycle and idiomatic APIs (compound components, hooks,
  composables, actions, DOM controllers). They bind Core; they never re-implement it.

## Entry points

Every adapter (and Core) has the same shape once domains exist:

```text
src/
├── index.ts            # root entry: only `export * from "./<domain>/index.js"` lines
├── calendar/index.ts   # /calendar
├── date/index.ts       # /date
├── time/index.ts       # /time
├── datetime/index.ts   # /datetime
└── shared/             # internal helpers, never exported
```

- The root re-exports the four domain subpaths. `DatePanel` from `/date` and from the root
  is the same module file, so framework context identity holds when users mix import styles.
- A domain entry never imports the root entry.
- An entry and its `package.json` `exports` key are added by the stage that ships the
  domain's first component. Never add an empty entry.
- Core additionally has `./foundation`. Adapter domain folders import the matching Core
  subpath (`react/src/time/*` imports `@zealakit/chrono-core/time` and `/foundation`).

## Domain graph

```text
calendar ──> date, time, foundation
datetime ──> date + time
date ──────> foundation
time ──────> foundation        (never date)
nothing ───> calendar
```

`pnpm check:domains` (`scripts/check-domains.mjs`) enforces this on source and `dist`: folder
rules, reachability from each entry, import cycles, and no import of the package's own root.

## Foundation map (`packages/core/src/foundation/`)

| Folder | Holds |
| --- | --- |
| `values/` | `PlainDate`/`PlainTime`/`PlainDateTime`/`ZonedDateTime`, epoch-day math, add/compare/boundaries, ISO, `Date` conversion, `today()` |
| `locale/` | `Intl` wrappers: week info, names, hour cycle, direction, formatting, date part order |
| `constraints/` | date/time status, range checks, `createAvailability` |
| `ranges/` | inclusive date ranges, half-open intervals, `splitIntervalByDay` |
| `grid/` | month/year/decade grids, weekday headers, time axis |
| `a11y/` | pure grid-navigation, labels, default English messages |
| `store/` | `createStore`, `createControllable`, `getGlobalState`, `isBrowser` |

New shared logic goes in the folder that owns its concept. A function needs a named consumer in
plan 02's flows; otherwise it is not added. Conventions: months 1-based, Monday = 1, date ranges
inclusive, intervals half-open, no host time zone in `values/`, `now` and `locale` injected.

## Date domain (`date/`, plan 06)

- Core `date/` holds the panel controllers (`createDatePanelController`, range and multi variants),
  the input controllers (`createDateInputController`, `createDateRangeInputController`), the range
  state machine (`selection/range.ts`), the parser (`input/parse.ts`) and the presets. The generic
  segment engine, tokenizer and hidden-input helper live in `foundation/input/` so Time can reuse them.
- `onValueChange` fires on every change (also a partial range); `onValueCommit` only when a choice is
  complete. `null` is a real controlled value. Panels default `autoFocus` to **false**.
- Escape is consumed only to cancel a range draft or revert a text edit; never `stopPropagation()` for
  anything else (the app's popup closes on Escape).
- Adapter name clash: the foundation type `DateInput` is re-exported as `DateInputValue` because
  `DateInput` is a component. Types and components must not share a name.
- A new option goes into the controller type, the adapter key lists (React `options.ts`, Vue props,
  Svelte destructuring), the README table and a test, as for the Calendar.
- Parity: `tests/fixtures/date-parity.json` (regenerate from React with `UPDATE_PARITY=1`) must give
  identical snapshots in all four adapters.

## Time domain (`time/`, plan 07)

- Core `time/` reuses `foundation/input/` (segment engine, tokenizer, hidden inputs). It never imports
  `date/` and never touches a time zone: `timeZone` + `now` only seed `placeholderValue` and `data-now`.
- Names: the foundation type `TimeInput` is re-exported as `TimeInputValue` (a component has that name);
  bookable slots are `BookingSlot` / `getBookingSlots` (the foundation `TimeSlot` is the Calendar's axis slot);
  core panel state types end in `State` (`TimePanelOptionState`) because the components own the plain names.
- Ranges are half-open; `end <= start` is `end-before-start` unless `allowOvernight`; an end of 00:00 after a
  later start means the end of the day. A slot's `data` is the app's object: keep it out of controller state
  (read it through `controller.getSlot(key)`).
- A panel is one tab stop; option keys are `HH:mm` (list) or `[set:]part:value` (columns). Scrolling goes through
  `scrollOptionIntoView` (never throws). Type-ahead uses an injectable `timer`, never `Date.now()` in pure code.
- Parity: `tests/fixtures/time-parity.json` (regenerate from React with `UPDATE_PARITY=1`) must give identical
  snapshots in all four adapters.

## DateTime domain (`datetime/`, plan 08)

- `datetime/` **composes** `date/` and `time/` controllers; it holds no selection, segment or parsing
  logic of its own (`datetime-no-duplication.test.ts` guards it). It never imports `calendar/`.
- Value type follows `timeZone`: `ZonedDateTime` with one, `PlainDateTime` without. Use foundation zoned
  functions only (`toZoned`, `fromInstant`, `withTimeZone`); never convert through `Date`. The host zone must
  not matter: pass `timeZone` and `now` explicitly in every test.
- A DST gap keeps the typed wall time on screen and sets `adjusted`; never silently move a typed value. An
  overlap uses `disambiguation`. When a date change disables the chosen time, the value goes `null`.
- Commit only when the time part commits (a range: the end time). Picking a date never commits.
- Adapters: the containers (`DateTimePanelDate`, `DateTimePanelTime`...) provide the existing Date and Time
  contexts; `date/` and `time/` expose an internal `bind-panel` module for that and never import `datetime/`.
- Parity: `tests/fixtures/datetime-parity.json` (regenerate from React with `UPDATE_PARITY=1`).

## Calendar domain (`calendar/`, stage 3)

| Folder | Holds |
| --- | --- |
| `navigation/` | view definitions (built-in and custom), `getRange`, `getVisibleRange`, pure `navigate`, `getCalendarTitle` |
| `views/` | month, time-grid, list and Mini Calendar layouts (no events yet) |
| `events/` | Event parsing/filtering, month lanes and overflow, the all-day row, time-grid columns, agenda groups, the now-indicator |
| `interaction/` | Keyboard event focus, range selection, pointer capture and hit testing |
| `controllers/` | `createCalendarController`, `createMiniCalendarController`, the shared attribute getters |

Adapters bind the controllers: React/Vue/Svelte render parts and spread the attribute records,
Vanilla delegates events on a root element and leaves the markup to the app. A new attribute or
behavior goes in the core controller first, then the adapters and the parity fixture.
`pnpm check:size` guards the entry sizes (`size-budgets.json`).

## Where logic belongs

| Logic | Place |
| --- | --- |
| Date math, parsing, formatting, grid and axis generation, selection state | Core, in its domain folder |
| Anything shared by two domains | Core `foundation/` |
| Framework state binding, refs, effects, rendering | The adapter's domain folder |
| Framework helpers shared by an adapter's domains | The adapter's `src/shared/` |
| Popups, persistence, fetching, business rules | The consuming app (never Chrono) |
| Third-party integrations (Overlay, Radix, Base UI) | Example apps only |

## Change workflow

1. Read the stage plan; identify the owning package, domain, and existing tests.
2. Put shared contracts and math in Core; framework lifecycle in the adapter.
3. Use TypeScript `type` aliases, `import type`, explicit `.js` relative imports.
4. Keep imports SSR-safe and side-effect-free (`sideEffects: false`).
5. Export only implemented public APIs and their types.
6. Add focused tests in the owning package; run `pnpm check`.
7. Update the READMEs (all three languages) when public behavior changes; load the
   [readme-system skill](../readme-system/SKILL.md) and run `pnpm readme:check`.

## Test and build workflow

```bash
pnpm build                                     # core first, then adapters
pnpm --filter @zealakit/chrono-<pkg> run typecheck
pnpm --filter @zealakit/chrono-<pkg> run test
pnpm check
```

- Tests run with `node --test` against the built `dist` (`tests/*.test.ts` import
  `../dist/index.js`), with a happy-dom window registered by `tests/setup.ts`. Svelte runs with
  `--conditions=browser` and compiles `.svelte` files through a `registerHooks` loader.
- Core's `test` script runs the whole suite once per time zone (`UTC`, `America/New_York`,
  `Asia/Ho_Chi_Minh`, `Australia/Lord_Howe`) through `packages/core/scripts/test-tz.mjs`; plain
  values must come out identical in every zone. Tests need full ICU.
- Script tests live in `scripts/tests/*.test.mjs` (`pnpm test:scripts`).
- Do not add a second test framework or DOM library.
- Svelte builds with `svelte-package`, everything else with `tsc`.

## Release

- All five packages share one version. Only the four adapters are on npm. Core stays
  `workspace:^` in the repository; `scripts/bundle-core.mjs` (used by `pnpm pack:packages` and
  `scripts/npm-publish.ts`) vendors it into each tarball under `dist/vendor/core/`.
- `pnpm pack:packages` fails if a tarball contains a `.css` file.
- 0.2.0 is the first release to publish. The maintainer runs `pnpm npm:publish:all` by hand; agents never publish.
- `pnpm check:standalone` installs each tarball into an empty project with only the framework
  peer and Vite, imports every entry point from Node, and builds with Vite.
- Peer ranges: React `^18.0.0 || ^19.0.0`, Vue `^3.5.0`, Svelte `^5.0.0`.
- Publishing is manual and needs explicit authorization: `pnpm npm:publish:check`, then
  `pnpm npm:publish:all` (or one adapter). No CI, no automated publishing.

## Documentation

- READMEs are the only product documentation; follow the
  [readme-system skill](../readme-system/SKILL.md).
- User-facing integration skills live in `skills/chrono-<framework>.md`; internal agent
  guidance stays in `.agents/`. Link the former from READMEs, never the latter.
- Document implemented behavior only. Integrations are documented as recipes, never as a
  Chrono feature.
