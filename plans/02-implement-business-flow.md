# Plan: implement Chrono's business flows (BRD → architecture → delivery stages)

Status: **proposal — not implemented**.

Sources:
- *Zealakit Chrono — Business Requirements Document (BRD)*, status Proposed.
- *Zealakit Chrono — BRD Update* (patch). It adds four product domains, a composition
  philosophy, a Provider and dependency policy, and sharper boundaries. Where the two
  documents differ, **the patch wins**.
- *Independent Usage and Optional Integrations* (third-party and Zealakit ecosystem rules).
  It sharpens the patch: no Overlay or third-party UI library in any dependency field, no
  styling of any kind, integrations only in examples. See §2.8.

Order: **2 of N**. Runs after `01-create-src.md` (monorepo skeleton green). This plan is the
**master plan**. It turns the BRD into an architecture, a headless contract, the business
flows the library must support, and a staged delivery order. Each stage in §9 gets its own
detailed plan (`03-…`, `04-…`). Those plans hold the API signatures, file lists and test
cases. This one does not.

**Scope rule:** decisions and structure only. No code and no final API signatures. Names used
below (`createDatePanel`, `useTimeInput`, `data-selected`) show the *shape* of the contract.
The stage plans can rename them. Component names (`DateInput`, `DatePanel`, …) come from the
BRD patch and are fixed.

**Positioning (BRD patch §10):** Zealakit Chrono is a headless calendar and date/time
interaction library. It provides independent, composable **Calendar, Date, Time and
DateTime** capabilities. Developers build fully customized calendar, date selection, time
selection and scheduling experiences without a predefined UI or design system.

---

## 1. What the BRD asks for, in engineering terms

| BRD section | Engineering meaning |
| --- | --- |
| §1, §8 Headless | No styles, no markup opinions. Ship **state + behavior + a11y + layout math**. The consumer renders. |
| Patch §1 Four domains | Calendar, Date, Time, DateTime are separate code areas with a one-way dependency graph (§3). Each can be imported and used alone. |
| Patch §2–§5 Domain scopes | Date and Time never need Calendar. Time never needs Date. DateTime reuses Date + Time and duplicates neither. |
| Patch §6 Composition | Chrono ships **Input** and **Panel** components that work alone. The app combines them inside its own popover, dialog or sidebar. Chrono owns value, selection, keyboard and a11y *inside* its components. The app owns popup, portal, layering and visuals. |
| Patch §7 Provider policy | No required global Provider. Every component works from its own props. Context exists only inside compound components. |
| Integrations doc | Standalone. No Overlay, Radix, Base UI or other UI library in any dependency field, direct or indirect. No CSS, no theme, no visual styles. Integrations exist only as example apps that install the library themselves (§2.8). |
| §8.3 Composable | Usable at three depths: pure functions → state controllers → unstyled components (§4). |
| §9 Framework flexibility | Same behavior in Vanilla, React, Vue, Svelte. Logic lives once, in `chrono-core`. |
| §11, patch §8 Boundaries | Chrono **proposes** changes (new event, moved event, selected range). The consumer **decides** and persists. Chrono is not a backend, not a popup library, not a design system and not a general-purpose date library. |
| §12 Accessibility first | Every interactive surface has a keyboard path and ARIA semantics. Pointer-only features (drag, resize) also have a keyboard equivalent. |
| §12 Consistent | One value model, one constraint model, one controlled/uncontrolled convention, one `data-*` vocabulary across all domains. |
| §15 Quality metrics | Correctness across DST, leap years, locales and week starts is tested in core. Event layout is benchmarked. |

---

## 2. Key decisions

### 2.1 Date/time engine — **decided: own minimal engine in core, zero dependencies**

Options considered:

| Option | Pros | Cons |
| --- | --- | --- |
| Native `Date` directly | No deps | Mutable, local-time bugs, DST traps, no plain-date type |
| `Temporal` (native/polyfill) | The right model (PlainDate, PlainTime, ZonedDateTime) | Not in every supported browser yet. The polyfill is large |
| `@internationalized/date` | Mature, calendar systems, used by React Aria | Runtime dependency in a private, bundled core. Its types leak into the public API |
| date-fns / dayjs / luxon | Familiar | Wraps `Date` (date-fns) or adds a large dependency. Wrong model for plain dates |
| **Own minimal engine** | Zero deps, small, exact semantics we need | We own the correctness. Mitigation: a heavy test suite (§8) |

**Decision (confirmed):** core defines small immutable value types shaped like Temporal's:

- `PlainDate` `{ year, month, day }` — calendar date, no time, no zone. Arithmetic uses an
  epoch-day integer, so there are no `Date`/DST traps.
- `PlainTime` `{ hour, minute, second }`.
- `PlainDateTime` — date + time, no zone.
- `ZonedDateTime` — a plain date-time plus an IANA zone id and the resolved UTC offset.
  Instant ↔ wall-time conversion goes through `Intl.DateTimeFormat` (no tz database shipped).
- **Outputs are always value objects.** Zoned DateTime components emit `ZonedDateTime`
  objects only — never ISO strings, never `Date`. Apps that need a string or a `Date` convert
  with core's serializers (`toISOString`-style, offset included) and `Date` converters, which
  are exported next to the types.
- Public inputs also accept ISO strings (`"2026-11-17"`, `"09:30"`, `"2026-11-17T09:30"`).
  Converters cover `Date` and Temporal objects, so consumers keep their own types.

Gregorian calendar only in v1. Non-Gregorian calendars (Buddhist, Japanese, Hijri) are out of
scope for v1. The value types keep a `calendar` slot so they can be added later without
breaking changes.

When Temporal is widely available, core can switch internals to it without changing the
public types. That is why the shapes follow Temporal.

**Limit (patch §8):** the engine exists to serve Chrono's components. The public utility
surface is only what the BRD's domain scopes name: comparison, ranges, validation,
constraints, locale presentation. It does not grow into a date-fns replacement (no general
formatting DSL, no duration library, no relative-time helpers).

### 2.2 Composition and popups — **decided: Input + Panel, no popup, no Overlay dependency**

The old "DatePicker owns open state and a trigger" model is replaced by the patch's
composition model:

- Each selection domain ships an **Input** (typed entry, segment editing, parsing) and a
  **Panel** (the visual chooser: month grid, time columns, slot list). Both work alone.
- The app puts a Panel inside its own popover, dialog, sidebar or inline layout: Zealakit
  Overlay, Radix UI, Base UI or its own code. Chrono has **no open state, no trigger, no
  positioning, no portal, no layering**.
- Input and Panel are connected by sharing one controlled value. A Panel also emits a
  **commit signal** (`onValueCommit`, or a `reason` on `onValueChange`) when a selection is
  complete, so the app knows when to close its popup. Example: a range is committed only
  after the end date is picked.
- Chrono manages focus **inside** its components (roving focus in the grid, segment focus in
  the input). Focus trap and focus return belong to the app's popup library.
- **No dependency on `@zealakit/overlay`, direct or indirect** (§2.8). Integrations with
  Overlay, Radix, Base UI and a plain `<dialog>` are shown in examples only.
- Chrono ships **no Overlay-specific (or Radix-, Base UI-specific) triggers, popup wrappers,
  positioning, portals or dismissal behavior** — not even as optional helpers. Closing on
  outside click or Escape is the popup library's job. Chrono's Escape handling stays inside its
  own components (e.g. cancelling a range preview) and does not stop the event from reaching
  the app's popup.
- **v1 ships no convenience compositions** (decided). A ready-made "DateInput + DatePanel"
  field is shown only in examples (F19). One may be added after 1.0 when real use cases ask
  for it. They must add no dependencies and must be built only from the public Input and
  Panel APIs, so they never restrict lower-level composition.

### 2.2a Input modes — **decided: both, segmented by default**

Every Input (`DateInput`, `DateRangeInput`, `TimeInput`, `TimeRangeInput`, `DateTimeInput`,
`DateTimeRangeInput`) supports two modes through one option (shape, e.g.
`mode: "segmented" | "text"`, is set by the stage plans):

- **`segmented` (default):** one spinbutton per part (day/month/year, hour/minute/second/
  period). Typing, arrow keys to step, Backspace to clear a part, auto-advance, locale-driven
  part order and separators. Best accessibility and no ambiguous parsing.
- **`text`:** one native text field. The app's typed text is parsed on blur and on Enter (and
  on paste) with a locale-aware parser that accepts the locale's own format plus ISO. Text that
  cannot be parsed is kept as typed, marked `data-invalid`, and reported through
  `onInvalidInput(text)`. An optional `parse` / `format` pair lets the app replace the
  built-in ones. Best for fast keyboard entry and mobile.

Both modes share one controller per Input: the same value, constraints, validation, events and
`data-*` attributes. Only the editing surface differs, so switching modes never changes
behavior around the field. Parsing and segment logic live in core (`date/input`, `time/input`),
and DateTime composes the Date and Time input logic in both modes.

### 2.3 Controlled / uncontrolled convention (all components, all adapters)

Every piece of state uses one pattern: `value` / `defaultValue` / `onValueChange`. The same
applies to `focusedDate` / visible month (panel navigation), `date` (calendar anchor), `view`
and `selection`. Internal state is only used when the consumer does not control it. React,
Vue (`v-model:*`) and Svelte (`bind:*`) map this pattern to their own idioms. There is no
`open` state (§2.2).

### 2.4 Proposal model for mutations (BRD §11)

All interactions that would change consumer data produce a **proposal**:
`{ kind, event?, resource?, start, end, allDay, source: "pointer" | "keyboard" }`.

- The consumer accepts it (updates its own data, Chrono re-renders) or rejects it (Chrono
  snaps back).
- A sync or async `validate(proposal)` hook can mark a drop target invalid *during* the drag
  (`data-invalid`). Final authority stays with the consumer.

### 2.5 Provider and configuration policy (patch §7)

- **No required global Provider.** Each component gets locale, `weekStartsOn`, `hourCycle`,
  `timeZone` and `now` from its own props. Defaults come from `Intl` and the runtime.
- Context is allowed **only inside one compound component** (e.g. `DatePanel.Root` →
  `DatePanel.Cell`). It is never shared across components.
- An optional global configuration (e.g. a `ChronoConfig` for app-wide locale) is **not**
  part of the v1 plan. It is added only when a real use case shows that per-component props
  are not enough, and it stays optional: explicit props always win.

### 2.6 Domain structure — Calendar, Date, Time, DateTime (patch §1)

Dependency graph (arrows = "may import"):

```text
              ┌──────────── calendar ────────────┐
              │                │                 │
              ▼                ▼                 ▼
            date ◄──────── datetime ────────►  time
              │                                  │
              └──────────► foundation ◄──────────┘
```

- `foundation` — shared: value types, locale, constraints, ranges, date grid, time axis,
  a11y helpers, the controller/store base. It knows nothing about any domain.
- `date` and `time` depend only on `foundation`. **`time` never imports `date`** (opening
  hours, working hours, daily schedules have no date).
- `datetime` composes `date` + `time` and adds zone handling. It does not re-implement either.
- `calendar` may use `date`, `time` and `foundation`. **Nothing imports `calendar`.**
- The rule is enforced by `scripts/check-domains.mjs` on source and `dist`
  (`03-foundation.md` §4).

### 2.7 Packaging — **decided: one package per framework, subpath export per domain**

No separate packages per domain. Each framework keeps one published package
(`@zealakit/chrono-vanilla`, `-react`, `-vue`, `-svelte`), and every domain is reachable two ways:

```ts
// Domain-specific imports
import { Calendar } from '@zealakit/chrono-react/calendar';
import { DateInput, DatePanel } from '@zealakit/chrono-react/date';
import { TimeInput, TimePanel } from '@zealakit/chrono-react/time';
import { DateTimeInput, DateTimePanel } from '@zealakit/chrono-react/datetime';

// Root import: re-exports the public API of all four domains
import { Calendar, DateInput, DatePanel, TimeInput, TimePanel,
         DateTimeInput, DateTimePanel } from '@zealakit/chrono-react';
```

**Source layout (same in every adapter):**

```text
packages/<framework>/src/
├── index.ts            # root entry: export * from each domain entry, nothing else
├── calendar/index.ts   # /calendar entry: Calendar domain API only
├── date/index.ts       # /date entry
├── time/index.ts       # /time entry
├── datetime/index.ts   # /datetime entry
└── shared/             # internal framework helpers (Slot, controllable state…), never exported
```

**`package.json` `exports`:** `"."`, `"./calendar"`, `"./date"`, `"./time"`, `"./datetime"`, each
with `types` + `import` (Svelte also `svelte`) pointing into one `dist/` tree. ESM only, no
CJS build, so there is no dual-package hazard.

**Requirements and how they are met:**

| Requirement | How |
| --- | --- |
| Root re-exports all four domains | `src/index.ts` is only `export * from './<domain>/index.js'` lines. No code of its own |
| Each subpath exposes only its domain | Each `src/<domain>/index.ts` exports only that domain's components, hooks/controllers, types and utilities. Shared value types it needs (`PlainDate`…) are re-exported from core, not redefined |
| Same underlying implementation for every entry point | The root entry re-exports the subpath modules, so `DatePanel` from `/date` and from the root is the **same module file** in `dist/date/`. React/Vue/Svelte context identity is preserved when users mix both import styles |
| No duplicated implementations | Logic lives once in core (§3). Adapter domain folders only bind it. Re-exporting one binding through several entries is allowed (same binding, no ESM ambiguity) |
| No circular imports | Import direction is root → domain entries → domain files → `shared/` → core. Domain entries never import the root entry. A domain imports another domain only where §2.6 allows it (`datetime` → `date`, `time`; `calendar` → `date`, `time`), through internal files, never through the root |
| No unnecessary cross-domain deps | Calendar uses Date/Time capabilities **through core** (`@zealakit/chrono-core/date`…), not through the adapter's Date components, unless it really reuses a component. Time never touches Date |
| Tree-shaking for root and subpath | `sideEffects: false`, ESM, no top-level side effects in any module, no barrel that runs code. Importing `TimeInput` from the root or from `/time` pulls in the same files |
| Domain boundaries intact | Enforced on source **and** on `dist` by `scripts/check-domains.mjs` (§8): it walks the import graph from each entry and fails if `/time` reaches `date/` or `calendar/`, if `/date` reaches `calendar/`, or if anything reaches the root entry |
| No export-name collisions | `export *` silently drops names that two domains export with different bindings. A test asserts that the root's export names are exactly the union of the four subpaths' export names. Names that could clash are domain-prefixed (`DateRangeValue`, `TimeRangeValue`) |

**Core follows the same shape.** The private `@zealakit/chrono-core` exposes `.` plus
`./foundation`, `./calendar`, `./date`, `./time`, `./datetime`. Adapter domain folders import
the matching core subpath (`react/src/time/*` imports `@zealakit/chrono-core/time` and
`/foundation`, never `/date`). `scripts/bundle-core.mjs` must rewrite these subpath
specifiers (not only the bare `@zealakit/chrono-core`) to relative `dist/vendor/core/…`
paths at pack time.

**Entries are added when they have content.** A domain subpath (and its `export *` line in the
root) is created by the stage that ships the domain's first component: `/calendar` in stage 2,
`/date`, `/time`, `/datetime` in stage 4. No empty entry points (the "no speculative exports"
rule).

### 2.8 Independence, third-party integrations and styling ownership

Source: *Independent Usage and Optional Integrations*. These are hard rules for every
package (core and the four adapters) and every stage.

**Independence**

- Chrono is standalone. It works with no UI library installed. Nothing in Chrono's runtime,
  types, tests or docs-as-API depends on an integration.
- **No external UI library in any dependency field** of any Chrono package:
  `dependencies`, `peerDependencies`, `optionalDependencies`, `peerDependenciesMeta`, and
  `devDependencies` too (package tests must not need them). This covers
  `@zealakit/overlay-*`, `@radix-ui/*`, `@base-ui-components/*` / `@base-ui/*`, and any other
  popup, dialog or component library.
- **Indirect counts too:** core has zero runtime dependencies (§2.1) and the adapters
  depend only on core plus their framework peer (`react`/`react-dom`, `vue`, `svelte`). So no
  UI library can arrive transitively.
- Allowed per package (enforced by `scripts/check-deps.mjs`, plan 01 §4.4):

  | Package | `dependencies` | `peerDependencies` | `devDependencies` |
  | --- | --- | --- | --- |
  | core | none | none | test tooling only (`happy-dom`) |
  | vanilla | `@zealakit/chrono-core` | none | test tooling only |
  | react | `@zealakit/chrono-core` | `react`, `react-dom` | test tooling + React types/runtime |
  | vue | `@zealakit/chrono-core` | `vue` | test tooling + Vue runtime |
  | svelte | `@zealakit/chrono-core` | `svelte` | test tooling + Svelte tooling |

  Anything else fails `pnpm check`. Adding an entry to this allowlist needs a plan change.

**Integrations live in examples only**

- Integration examples (Overlay, Radix, Base UI, `<dialog>`) are separate example apps, e.g.
  `examples/react-overlay`, `examples/react-radix`, `examples/react-base-ui`,
  `examples/vue-overlay`, `examples/svelte-overlay`. **Each example installs and configures
  the library in its own `package.json`.** No Chrono package, root script or shared config
  installs it for them.
- Chrono's own tests never import an integration. Example builds are checked separately
  (`pnpm --filter "./examples/*" build`), so a broken third-party release cannot break Chrono's
  checks.
- Docs describe integrations as recipes ("put `DatePanel` inside your popover and close it on
  `onValueCommit`"), never as a Chrono feature.

**Styling ownership**

- Chrono ships **no CSS**: no stylesheet, no theme, no CSS-in-JS, no required styling package,
  no class names it expects the app to style. Package `files` and tarballs contain no `.css`.
- Chrono **never sets visual styles** (colors, fonts, spacing, sizes, borders, display,
  position). Components render the consumer's element with the consumer's `class`/`style`.
- The only things Chrono writes that styling can use are **state** (`data-*`, ARIA) and
  **layout numbers** as CSS custom properties (`--chrono-event-top` …, §4). Custom
  properties are inert until the app's CSS uses them.
- One narrow exception, for accessibility only: the live-region announcer (stage 3) uses the
  standard visually-hidden inline style so screen readers can read it. It is invisible and not
  a design decision. It can be replaced by an app-provided element.
- Enforced by tests: attribute records never contain `style` except `--chrono-*`
  properties, and `pnpm pack:packages` fails if a tarball contains `.css`.

---

## 3. Core architecture (`@zealakit/chrono-core`)

Folders follow the domains. Inside each folder, lower layers never import higher ones.

```text
foundation/
  values/        PlainDate, PlainTime, PlainDateTime, zoned helpers, ISO parse/serialize,
                 compare, add/subtract, start/end of week/month, week numbers
  locale/        Intl-backed: first day of week, weekend days, month/weekday names,
                 12h/24h preference, number system, presentation helpers
  constraints/   min/max, disabled predicate, availability (dates + time ranges),
                 range length min/max, step/interval rules → one `isAvailable()` answer
  ranges/        interval math, overlap, clamp, split-by-day
  grid/          month date grid (weeks × days, adjacent days, week numbers), multi-month,
                 year/decade grids, time axis (slots by interval, working hours)
  a11y/          roving-tabindex grid navigation (APG grid pattern), ARIA attribute builders,
                 label text via Intl, live-region announcer
  store/         tiny controller base: subscribe/getState/actions, controlled/uncontrolled
                 value resolution, prop/attribute getter helpers

date/
  selection/     single, range (with hover preview, commit), multiple
  panel/         DatePanel / DateRangePanel / MultiDatePanel controllers: grid navigation
                 (day/month/year levels), selection, constraints, state attributes
  input/         DateInput / DateRangeInput controllers: segments, typing, parsing,
                 validation, locale order of segments

time/
  selection/     single time, time range (incl. overnight), slot selection
  panel/         TimePanel / TimeRangePanel controllers: columns (hour/minute/second/period)
                 or slot list, intervals, disabled time ranges
  input/         TimeInput / TimeRangeInput controllers: segments, 12/24h, spin keys

datetime/
  zone/          display zone ↔ value zone, DST gaps/overlaps in wall time
  panel/, input/ DateTimePanel / DateTimeRangePanel / DateTimeInput / DateTimeRangeInput:
                 compose date + time controllers, cross-part constraints

calendar/
  navigation/    view state: view kind, anchor date, visible range, prev/next/today/goTo,
                 view switching, custom views (consumer-defined range + grid)
  views/         month, week, work week, day, agenda, multi-month, mini calendar models
  events/        normalize input events → segments, month lane packing, time-grid overlap
                 columns, overflow ("+N more"), agenda grouping, recurrence (stage 5)
  interaction/   pointer → date/time hit testing, slot drag-select, event move/resize,
                 snapping, auto-scroll hooks, proposal + validate lifecycle, keyboard mode
  resources/     resource columns + grouping, timeline (horizontal axis), per-resource
                 slots and availability (stage 5)
```

Rules:

- `foundation/values|locale|constraints|ranges|grid` and the layout parts of `calendar/events`
  are **pure** (no DOM). They are unit-tested in plain Node and work on the server
  (SSR can render a correct first frame).
- Controllers touch the DOM only inside actions and lifecycle hooks. Nothing touches the DOM
  at import time. `isBrowser()` guards, same as Overlay.
- Page-global state (if any, e.g. an active drag) goes through `getGlobalState()` with a
  versioned `Symbol.for` key, because each adapter bundles its own copy of core.
- The month grid lives in `foundation/grid` because both `DatePanel` (date) and the month
  view / mini calendar (calendar) use it. This is the "shared foundational utilities" case in
  patch §1, not a date → calendar coupling.

---

## 4. Headless contract (what every adapter exposes)

Three depths, matching BRD §8.3 "use complete experiences or compose only what you need":

| Depth | What the consumer gets | Example use |
| --- | --- | --- |
| 1. Utilities | Pure functions from core, re-exported by the domain subpath that owns them (`isDateAvailable` from `/date`, `layoutTimedEvents` from `/calendar`) and by the root. Limited by §2.1 | Custom renderer, canvas, server-side rendering of a static calendar |
| 2. State controllers | Vanilla: controller objects. React: hooks. Vue: composables. Svelte: runes-based factories | Full custom markup and design system |
| 3. Unstyled components | Compound components with no CSS, flat named parts (plan 04 C1): `DateInput`/`DateInputSegment`, `DatePanel`/`DatePanelGrid`/`DatePanelCell`, `TimePanel`/`TimePanelColumn`/`TimePanelOption`, `Calendar`/`CalendarMonthGrid`/`CalendarTimeGrid`/`CalendarCell`, `MiniCalendar…`. Vanilla: optional declarative `data-*` init for Inputs and Panels only (Date, Time, DateTime). Calendar views use controllers | Fast start that still renders the consumer's markup and classes |

Shared vocabulary (identical across adapters and domains, documented once per component):

- **State attributes:** `data-today`, `data-selected`, `data-outside-month`, `data-disabled`,
  `data-unavailable`, `data-weekend`, `data-focused`, `data-range-start`, `data-range-end`,
  `data-in-range`, `data-range-preview`, `data-marked` (Mini Calendar "has events"), `data-invalid`, `data-placeholder` (empty input
  segment), `data-dragging`, `data-resizing`, `data-all-day`, `data-continues-before`,
  `data-continues-after`, `data-overflow`, `data-past`, `data-recurring`, `data-selecting`,
  `data-has-events` (added in plan 05), `data-editable`, `data-pending`, `data-drag-preview`
  (plan 09), `data-resource-id`, `data-resource-group`, `data-collapsed`, `data-header-level`
  (plan 10), `data-partially-available`, `data-chrono-background`, `data-status`, `data-rule-id`
  (plan 11), `data-override` (plan 12), `data-range-blocked` (plan 06), `data-adjusted`,
  `data-offset` (plan 08).
- **Layout output** is numbers and CSS custom properties, never visual styles (§2.8):
  `--chrono-event-top`, `--chrono-event-height`, `--chrono-event-column`,
  `--chrono-event-columns`, `--chrono-event-lane`, `--chrono-event-span`, and for timelines
  `--chrono-event-left`, `--chrono-event-width`, `--chrono-row-lanes` (plan 10). The consumer decides
  how to use them (absolute positioning, CSS grid, canvas).
- **Render props / slots** for every visible piece (cell, segment, option, event, slot,
  header), so content is always the consumer's.

---

## 5. Business flows

Each flow lists what goes in, what Chrono does, what comes out, and what stays with the
consumer (BRD §11, patch §6, §8). These are the acceptance scenarios that the stage plans must
turn into tests and examples. Flows are grouped by domain.

### Calendar domain

#### F1 — Navigate a calendar (views + navigation)

- **In:** `view` (month, week, work week, day, agenda, multi-month, custom), anchor `date`,
  locale, `weekStartsOn`, optional `visibleRange` for custom views.
- **Chrono:** computes the visible range and grid. Actions: `prev`, `next`, `today`, `goTo(date)`,
  `setView(view)`. Keeps the focused date valid when the view changes (for example, the focused
  day stays inside the new week).
- **Out:** `onDateChange`, `onViewChange`, `onVisibleRangeChange(start, end)`. The consumer
  uses the last one to fetch events for that range.
- **Consumer:** loads data for the visible range.

#### F2 — Mini Calendar

- **In:** anchor `date` and visible range of a main calendar (optional), event-day markers
  (optional, e.g. "has events").
- **Chrono:** small month grid with navigation. Highlights the main calendar's visible range
  (`data-in-range`) and today. Picking a day **navigates** (it is not a value selection).
- **Out:** `onNavigate(date)`. The app wires it to F1's `goTo`.
- **Note:** shares `foundation/grid` and grid keyboard handling with `DatePanel`. It is a
  Calendar component, not a Date component.

#### F3 — Show events in a month view

- **In:** visible range, events `{ id, start, end, allDay, resourceId?, ...consumerData }`,
  `maxEventsPerCell`.
- **Chrono:** splits multi-day events per week row, packs lanes (longest first, then start),
  sets continues-before/after flags, computes "+N more" overflow per day. Exposes the hidden
  events for a "more" list.
- **Out:** per-cell and per-row segments with lane and span, overflow lists.
- **Consumer:** event content, colors, the "more" popup.

#### F4 — Show events in a week / work week / day time grid

- **In:** visible range, events, `slotDuration`, `dayStart`/`dayEnd`, working hours,
  `hiddenDays` (work week = hide weekend from locale), `timeZone`.
- **Chrono:** all-day row (same lane packing as F3). Timed area: clusters overlapping events,
  assigns columns, expands each event to the right where free, computes top/height from time.
  Events crossing midnight are split per day. Handles DST days (23/25-hour days) correctly.
  Current-time indicator position. Time slot and scheduling visualization (working hours,
  slot lines) as data.
- **Out:** segments with top/height/column/columns + now-indicator position.

#### F5 — Agenda / list view

- **In:** range, events.
- **Chrono:** groups by day (or a consumer key), sorts, flags multi-day continuations,
  supports "no events" days on/off.
- **Out:** grouped list model + listbox/grid keyboard navigation.

#### F6 — Select and create events from the calendar

- **In:** time grid or month grid, `selectable`, `validate`.
- **Chrono:** event selection and click (`onEventSelect`, `onEventClick`, keyboard
  Enter/Space). Range creation: pointer drag across slots/days (snapped to `slotDuration`),
  or keyboard (focus a slot, Shift+arrows to extend, Enter to confirm). Preview while selecting.
- **Out:** `onSelectRange(proposal)`.
- **Consumer:** opens its own "new event" form and persists the event.

#### F7 — Move and resize events (stage 5)

- **In:** events with `editable` / `movable` / `resizable` flags, `validate`, snap settings.
- **Chrono:** drag preview (ghost segment), snapping, cross-day and cross-view moves
  (time grid ↔ all-day row), cross-resource moves, auto-scroll hooks near edges, Escape to
  cancel. Keyboard mode: select the event, then move/resize with arrows, Enter/Escape.
  Live announcements ("Meeting moved to Tuesday 10:00").
- **Out:** `onEventChange(proposal)`. The consumer resolves it to accept or reject.
- **Consumer:** conflict rules, permissions, persistence.

#### F8 — Resource calendar and resource timeline (stage 5)

- **In:** `resources` (tree for grouping), events with `resourceId`, per-resource availability.
- **Chrono:** resource columns inside the time grid (day view × N resources). Timeline =
  the same axis math rotated (resources as rows, time horizontal), with zoom levels
  (hour/day/week). Event layout per resource row uses the same overlap engine as F4.
- **Out:** layout model per resource.

#### F9 — Availability visualization (stage 5)

- **In:** available/blocked dates, slots and periods (as data or a predicate).
- **Chrono:** the same `foundation/constraints` availability model drives Calendar
  backgrounds (`data-unavailable`, blocked segments) **and** Date/Time selection (F10–F15).
  One model, no duplication between domains.
- **Consumer:** where the availability data comes from and whether it is still true.

#### F10 — Recurring events (stage 5)

- **v1 default:** the consumer passes already-expanded occurrences. Chrono marks them with
  `recurringId` and shows them like other events.
- **Stage 5:** optional RRULE subset expansion in core (DAILY/WEEKLY/MONTHLY/YEARLY, INTERVAL,
  COUNT, UNTIL, BYDAY, BYMONTHDAY, EXDATE), limited to the visible range.
  Interaction proposals carry `scope: "this" | "following" | "all"`. The consumer applies them.

### Date domain (works without Calendar)

#### F11 — Enter a date (DateInput)

- **In:** `value`, locale (segment order and separators), constraints, `placeholder` value,
  read-only, disabled, required.
- **Chrono:** `segmented` mode (default): editing per part (day/month/year) with typing,
  arrows to increment, Backspace to clear a part, auto-advance, paste of a full date.
  `text` mode: one field parsed on blur/Enter/paste (locale format + ISO). Both modes mark
  invalid or out-of-range values (`data-invalid`) without throwing them away (§2.2a).
- **Out:** `onValueChange(PlainDate | null)`, validation state for the app's form.
- **Consumer:** labels, error messages, form submission, business validation.

#### F12 — Pick a date (DatePanel)

- **In:** `value`, constraints (min, max, `isDateDisabled`, availability), visible month.
- **Chrono:** grid with state attributes. Day / month / year levels. Keyboard: arrows,
  Home/End, PageUp/PageDown (+Shift for year). Disabled dates are focusable but not selectable
  (APG).
- **Out:** `onValueChange`, `onValueCommit`, `onVisibleMonthChange`.
- **Composition:** used inline, or inside the app's popover next to a `DateInput` with a
  shared value (§2.2).

#### F13 — Pick a date range (DateRangeInput, DateRangePanel)

- **In:** `value {start, end}`, constraints, `minLength`/`maxLength` in days, an optional
  "disabled dates inside the range are allowed / not allowed" rule.
- **Chrono:** Panel: two-click (or keyboard Enter–Enter) flow, hover/focus preview between the
  first pick and the pointer, auto-swap when picked backwards, multi-month display. Input:
  start and end segment groups. Both block completion when the range breaks constraints, and
  report the reason.
- **Out:** `onValueChange`, `onValueCommit` (only when the range is complete),
  `onRangePreviewChange`, `onInvalidRange(reason)`.
- **Consumer:** real availability (e.g. hotel rooms). Chrono only shows what it was given.

#### F14 — Pick many dates (MultiDatePanel)

- **In:** `value: PlainDate[]`, `max` count, constraints.
- **Chrono:** toggle per date, optional shift-click range-add, stable sorting, dedupe.
- **Out:** `onValueChange(PlainDate[])`.

### Time domain (works without a date)

#### F15 — Enter or pick a time (TimeInput, TimePanel) and time slots

- **In:** `value`, `hourCycle` (12/24, default from locale), `step` / minute interval,
  `minTime`/`maxTime`, disabled time ranges, available/unavailable slots, slot duration.
- **Chrono:** TimeInput: `segmented` mode (default) with one spinbutton per part
  (hour/minute/second/period), or `text` mode parsed on blur (§2.2a).
  TimePanel: columns (hour/minute/second/period) or a slot list, grouped by part of day or a
  consumer grouping function.
- **Out:** `onValueChange(PlainTime | null)`, `onValueCommit`.
- **Use cases:** opening hours, working hours, daily schedules, appointment slots.

#### F16 — Pick a time range (TimeRangeInput, TimeRangePanel)

- **In:** `value {start, end}`, constraints, `minDuration`/`maxDuration`, `allowOvernight`.
- **Chrono:** start/end editing, end-after-start validation (or overnight wrap when allowed),
  preview in the panel.
- **Out:** `onValueChange`, `onValueCommit`, `onInvalidRange(reason)`.

### DateTime domain (composes Date + Time)

#### F17 — Enter or pick a date and time (DateTimeInput, DateTimePanel)

- **In:** combined value, combined constraints, `timeZone` (display zone), value type
  (`PlainDateTime` when no zone is set, `ZonedDateTime` when `timeZone` is set).
- **Chrono:** composes F11/F12 with F15 through their controllers (no copied logic). Checks
  constraints across both parts (e.g. today's past times are disabled when `min = now`).
  Handles DST gaps (non-existent wall times) and overlaps (ambiguous wall times) with an
  explicit `disambiguation` option.
- **Out:** `onValueChange`, `onValueCommit`.
- **Consumer:** which zone is authoritative for storage.

#### F18 — Pick a date-time range (DateTimeRangeInput, DateTimeRangePanel)

- **In:** `{start, end}` date-times, constraints, `minDuration`/`maxDuration`, `timeZone`.
- **Chrono:** composes F13 with F16. Validates across days (end after start including time).
- **Out:** `onValueChange`, `onValueCommit`, `onInvalidRange(reason)`.

### Cross-domain

#### F19 — Compose with an external popup

- **In:** an app popup (Zealakit Overlay, Radix, Base UI, `<dialog>`, sidebar), a Chrono Input
  and a Chrono Panel sharing one value.
- **Chrono:** keeps both in sync through the shared controlled value, moves focus into the
  Panel's active cell when the Panel mounts **if `autoFocus` is set** (opt-in; off by default
  so inline panels never steal focus, plan 06 A8), and fires `onValueCommit` when the
  selection is complete.
- **App:** opens/closes, positions, portals, traps and returns focus, and closes on commit if
  it wants to.
- **Acceptance:** one example app per integration target per framework where the target
  exists (Radix/Base UI are React-only): `examples/<framework>-<library>`. Each example
  installs the library itself (§2.8). None of them is a Chrono dependency of any kind, and the
  same Chrono components work unchanged with every target and with no popup at all (inline).

---

## 6. Adapter responsibilities

| Package | Adds on top of core |
| --- | --- |
| `vanilla` | Controllers with `mount(element)` / `destroy()`, DOM event wiring, declarative `data-*` init (`initChrono()`-style, name set in the stage plan) for Inputs and Panels only. Calendar views (incl. Mini Calendar) are controller-only: their markup depends on consumer events and layout data, which static `data-*` markup cannot describe well |
| `react` | Hooks (`useDatePanel`, `useTimeInput`, `useCalendar`…), compound components, `asChild`-style slotting like Overlay, SSR-safe effects |
| `vue` | Composables + render-function components, `v-model` mapping |
| `svelte` | `.svelte` components + runes-based state, `bind:` mapping, actions for DOM wiring |

Every adapter has the same five entry points and source layout (§2.7). Adapters stay thin. If
an adapter needs logic that is not a framework binding, that logic goes into core.
Framework-specific helpers live in the adapter's internal `src/shared/` and are never
exported. No adapter-to-adapter imports. No adapter ships a global Provider (§2.5).

---

## 7. Non-functional requirements

| Area | Target |
| --- | --- |
| Accessibility | WAI-ARIA APG patterns: Grid (calendar, panels), Spinbutton (segmented inputs), labelled textbox (text-mode inputs), Listbox (time options, slots). Keyboard parity for every pointer interaction. Screen-reader labels from `Intl`. Manual check with VoiceOver + NVDA per stage |
| i18n | Locale from `Intl`. Week start, weekend, hour cycle, segment order and names are locale-driven and overridable per component. RTL: the grid keyboard flips arrows under `dir="rtl"` |
| Time zones | Pure plain-date logic by default. Zoned display through an explicit `timeZone` option. Tests run under at least `UTC`, `America/New_York`, `Asia/Ho_Chi_Minh`, `Australia/Lord_Howe` (30-min DST) |
| SSR | No DOM at import or render. First render matches between server and client when `now` / `today` is passed in (option `now` to avoid hydration mismatch) |
| Domain independence | Importing only `/time` (or only `TimeInput` from the root) bundles no Date or Calendar code. Importing only `/date` bundles no Calendar code. Checked by the `dist` import-graph walk in `scripts/check-domains.mjs` |
| Performance | Layout of 1,000 events in a week view < 16 ms in Node. Month grid < 1 ms. Benchmarks in core tests, reported but not CI-gated at first |
| Size | Tree-shakeable exports, `sideEffects: false`. Track gzip size per entry point (root + each subpath) in the monitor. Budget is set in each stage plan |
| Compatibility | Evergreen browsers. Node ≥ the version in `engines`. React 18/19, Vue 3.5+, Svelte 5 |

---

## 8. Testing strategy (same harness as plan 01: `node:test` + happy-dom)

- **Core, pure parts:** table-driven tests for date math (leap years, month ends,
  year boundaries, week numbers ISO vs locale), every DST transition in the test zones,
  constraint combinations, event layout fixtures (golden outputs for known overlap cases).
  The `test` script runs core tests once per test time zone (`TZ=… node --test`).
- **Core, controllers:** state-machine tests (sequence of actions → expected state + callbacks).
- **Domain boundaries and entry points:** `scripts/check-domains.mjs` (source and `dist`,
  core and adapters), plus a per-adapter test that the root's export names equal the union of
  the subpaths' export names and that `root.X === subpath.X` for every export.
- **Adapters:** render tests that check the shared `data-*` / ARIA output and the
  controlled/uncontrolled behavior. They do not re-test the math. Every component is tested
  with **no Provider** mounted.
- **Cross-adapter parity:** one shared fixture list per component. Each adapter's tests run
  the same scenarios and must produce the same attributes.
- **Examples:** each stage adds realistic examples per framework (BRD §13 "practical
  examples"): Outlook-like week view, booking range with DateRangeInput + DateRangePanel in a
  popover, opening-hours editor with TimeRangeInput only, resource scheduler.

---

## 9. Delivery stages (BRD §14, confirmed by patch §9 — order unchanged)

The four domains are product boundaries, not a requirement to build them at the same time
(patch §9). Each stage builds the `foundation` parts it needs.

Each stage = one plan file, one or more PRs, a minor version bump, new subpath entries for
the domains it ships (§2.7), READMEs (EN/VI/CN),
`skills/chrono-*.md` updates and examples. "Done" for a stage = the pnpm checks from plan 01
pass, the stage's flows have tests in core and every adapter, and examples build.

| Stage | Plan | Domain | Flows | Core folders | Ships |
| --- | --- | --- | --- | --- | --- |
| 1 Foundation | `03-foundation.md` | foundation | — | `foundation/*` (values, locale, constraints, ranges, grid, a11y, store), domain import check | Core only (internal). No adapter entry has content yet, so nothing user-facing ships. Internal `0.1.0` milestone |
| 2 Calendar views | `04-calendar-views.md` | Calendar | F1, F2 | `calendar/navigation`, `calendar/views` | Month, week, work week, day, agenda shell, multi-month, custom views, Mini Calendar, navigation, headers. Adds the `/calendar` subpath (and its root re-export) to all four adapters. `0.2.0` |
| 3 Events | `05-event-layout.md` | Calendar | F3, F4, F5, F6 | `calendar/events`, `calendar/interaction` (select + create) | Event layout for month / time grid / agenda, overflow, event selection, range creation. `0.3.0` |
| 4 Date & time selection | `06-date.md`, `07-time.md`, `08-datetime.md` | Date, Time, DateTime | F11–F19 | `date/*`, `time/*`, `datetime/*` | DateInput, DatePanel, DateRangeInput, DateRangePanel, MultiDatePanel, TimeInput, TimePanel, TimeRangeInput, TimeRangePanel, DateTimeInput, DateTimePanel, DateTimeRangeInput, DateTimeRangePanel. Adds the `/date`, `/time`, `/datetime` subpaths (and root re-exports) to all four adapters. `0.4.0` |
| 5a Drag and resize | `09-drag-resize.md` | Calendar | F7 | `calendar/interaction` (move/resize, auto-scroll) | Move/resize by pointer, touch and keyboard, proposals with pending/reject. `0.5.0` |
| 5b Resources | `10-resources.md` | Calendar | F8 | `calendar/resources` | Resource columns, grouping, resource timeline, moves across resources. `0.6.0` |
| 5c Availability | `11-availability.md` | Calendar (+ Date/Time reuse) | F9 | `calendar/` backgrounds on `foundation/constraints` | Availability and blocked periods in Calendar, shared model with pickers. `0.7.0` |
| 5d Recurrence | `12-recurrence.md` | Calendar | F10 | `calendar/events` recurrence | RRULE subset expansion, edit scope "this / following / all". `0.8.0` |
| 6 Ecosystem | `13-ecosystem.md` | — | — | — | Astro example, integration examples polish, docs, manual release checklist (no CI), core stays private, `1.0.0` API freeze criteria |

Stage 4 order inside the stage: Date → Time → DateTime (DateTime needs both). Date and Time
plans can run in parallel because neither imports the other.

From `0.2.0` on, each stage release is published to npm **by hand** by the maintainer (plan 04
C15), for every release including 1.0 — no CI or release automation (plan 13). Core is never
published. Stage 4 also ships prereleases on the
npm `next` dist-tag: `0.4.0-next.0` after Date (plan 06), `0.4.0-next.1` after Time, then
`0.4.0` on `latest` after DateTime.

`1.0.0` is cut only when the readiness criteria in `13-ecosystem.md` §3 hold (all stages
shipped, a feedback period after `0.8.0`, API review, release candidate). Until then the API can change
between minors (documented in each README).

---

## 10. Out of scope (BRD §11, §16, patch §8)

Persistence, backend, sync with Google/Outlook/CalDAV, notifications, permissions, booking
confirmation, payments, resource management, conflict *resolution* rules.
Popup, overlay, portal, positioning or dismissal features, including library-specific
wrappers for Overlay, Radix or Base UI (§2.8). Styling, CSS, themes, design tokens, styling
packages.
General-purpose date/time utilities beyond what the domains need (§2.1). A required global
Provider. Non-Gregorian calendars (v1). Full RRULE (only the subset in F10).

---

## 11. Open questions

1. ~~**Date engine**~~ — **decided: own minimal engine** in core, zero dependencies (§2.1).
2. ~~**Popup integration**~~ — **decided: no dependency**, not even an optional peer (§2.2).
   Confirmed by patch §7.
3. ~~**Stage order**~~ — **decided: keep BRD order** (§9). Confirmed by patch §9.
4. ~~**Input style**~~ — **decided: both modes, `segmented` by default**, `text` as an
   option, one shared controller (§2.2a).
5. ~~**Vanilla declarative init**~~ — **decided: Inputs and Panels only.** Calendar views stay
   controller-only in Vanilla (§4, §6).
6. ~~**Zoned DateTime output**~~ — **decided: `ZonedDateTime` objects only.** No string
   output option. Serializers and `Date` converters are exported for apps that need them
   (§2.1).
7. ~~**Domain packaging**~~ — **decided: subpath exports per domain plus a root entry**
   that re-exports all four, in the existing four adapter packages. No per-domain packages
   (§2.7).
8. ~~**Convenience compositions**~~ — **decided: examples only for v1.** No ready-made
   Input + Panel component before 1.0 (§2.2).

All open questions are decided. Stage 1 is planned in `03-foundation.md`, stage 2 in
`04-calendar-views.md`, stage 3 in `05-event-layout.md`,
the Date part of stage 4 in `06-date.md`,
the Time part in `07-time.md`, the DateTime part in `08-datetime.md`. Stage 5 is split into
`09-drag-resize.md` (planned), `10-resources.md` (planned), `11-availability.md` (planned), `12-recurrence.md` (planned);
stage 6 is `13-ecosystem.md` (planned).
