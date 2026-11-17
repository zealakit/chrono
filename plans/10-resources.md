# Plan: stage 5b — Resource calendar and resource timeline (`/calendar`)

Status: **proposal — not implemented**.

Order: **10 of N**. Second stage-5 plan (02 §9). Runs after `09-drag-resize.md` (`0.5.0`).
Implements flow **F8**: resource columns inside day/week views, resource grouping, a
horizontal resource timeline with zoom levels, and moving or creating events per resource.
Next: `11-availability.md`.

Goal: support scheduling and reservation interfaces (rooms, staff, equipment, vehicles)
with the same headless contract as the rest of Calendar. Chrono lays out resources and their
events and reports proposals with resource ids; the app owns resources, permissions and
conflict rules (BRD §7.6: "not a resource management backend").

**Scope rule:**
- Calendar domain only, same `/calendar` entry.
- Reuses plan 05 layouts (lanes, overlap columns, E9 wall-time axis), plan 05 keyboard model
  (Enter into cell), plan 09 drag/resize and proposals.
- Availability backgrounds (blocked periods, closed hours) are plan 11. This plan only adds
  per-resource working hours as slot state.
- No styling (02 §2.8). Signatures below are **shapes**.

---

## 1. Decisions taken in this plan

| # | Topic | Decision | Why |
| --- | --- | --- | --- |
| R1 | Resource input | `resources: readonly TResource[]` where `TResource extends { id: string \| number; parentId?: string \| number }`. Flat list, tree via `parentId`, order = array order. App fields pass through (like 05 E1). `getResourceLabel(resource) → string` gives accessible names | Flat lists are what APIs return; the app filters and sorts by passing a different array |
| R2 | Events per resource | Event input gains `resourceId?: id \| readonly id[]`. An event with several ids shows in every listed resource. Events without a resource are not shown in resource views (dev warning once) | Meetings that book a room and two people are common (decided, §12.2) |
| R3 | Resource views are view definitions | Two new layouts, `"resource-time-grid"` and `"timeline"`, as `ViewDefinition`s (04 C3). Built-ins: `resourceDay`, `resourceWeek` (resource time grid), `timelineDay`, `timelineWeek`, `timelineMonth` (timeline). Custom resource views work like other custom views | One navigation engine; apps add e.g. a 3-day timeline with a definition |
| R4 | View packs (tree-shaking) | Resource layouts ship as an **opt-in view pack**: `import { resourceViews } from ".../calendar"` and pass `views={resourceViews}` (or pick single definitions). The base `Calendar` never imports resource code, so apps without resources do not pay for it (decided, §12.1) | Resources are the largest feature; most calendars don't need them. Keeps the plan-09 size for those apps |
| R5 | Resource time grid columns | Columns = visible days × resources. `resourceGrouping: "resource-first"` (default: each resource with its days) or `"date-first"` (each day with its resources). Each column is laid out with the 05 E8 algorithm; each has its own all-day cell | Room booking ("rooms across, one day") and staff views ("each person's week") |
| R6 | Timeline axis | Rows = resources, horizontal axis = time slots. A timeline definition sets `slotDuration` (`{ minutes }`, `{ days }` or `{ weeks }`) and `headerRows` (e.g. `["day", "hour"]`), producing header cells with spans. Positions: `--chrono-event-left`, `--chrono-event-width` (fractions of the visible axis). Wall-time axis with the 05 E9 DST rules | Zoomable hour/day/week timelines (F8) with multi-level headers |
| R7 | Timeline lanes | Within a resource row, overlapping events stack in lanes with the 05 E6 packing on the continuous axis: `--chrono-event-lane` and per row `--chrono-row-lanes`. Row height is the app's CSS (e.g. `calc(var(--chrono-row-lanes) * 24px)`) | No overlap hidden; the app keeps control of sizes |
| R8 | Zoom | `zoomLevels: string[]` (ids of timeline definitions, e.g. `["timelineDay", "timelineWeek", "timelineMonth"]`) with `zoomIn()` / `zoomOut()` actions that keep the focused date in view | F8 "zoom levels (hour/day/week)" |
| R9 | Grouping and collapse | Tree resources render group headers: spanning headers over child columns in the resource time grid; group rows in the timeline. `collapsedResourceIds` (controllable) hides descendants; events of hidden resources are not laid out. The grouped timeline uses the APG **treegrid** pattern (`aria-level`, `aria-expanded`); ungrouped uses `grid` | Departments → people, buildings → rooms; standard accessible tree semantics |
| R10 | Keyboard | Resource time grid: same grid as plan 05 with more columns. Timeline: ↑/↓ = previous/next resource row, ←/→ = previous/next slot (swapped in RTL), Home/End = first/last slot, PageUp/PageDown = previous/next range; on a group row, ← collapses, → expands (treegrid). Enter into cell, Shift+arrows selection, M/R editing all as plans 05 and 09 | One mental model across views |
| R11 | Moves across resources | Plan 09 proposals gain `from.resourceIds` / `to.resourceIds`. Dragging over another resource column (resource time grid) or row (timeline) replaces **only** the dragged-from resource in the event's list. `allowResourceChange` (default `true`); `validateEventChange` decides per target. Keyboard move: ←/→ across columns in the resource time grid (day or resource), ↑/↓ across rows in the timeline | F8 "cross-resource moves" without guessing for multi-resource events |
| R12 | Creating in a resource | Plan 05 `SelectionProposal` gains `resourceId`. A selection stays within one resource (dragging into another resource clamps to the start resource) | Booking a slot always targets one resource |
| R13 | Per-resource working hours | `getResourceWorkingHours(resource, date) → { start, end }[]` marks slots/cells with `data-working-hours` per resource. Blocked periods and availability shading are plan 11 | F8 "resource-specific time slots"; availability stays in one place |
| R14 | Windowing (large data) | `resourceWindow: { start, end }` (row/column index range) and, for timelines, `slotWindow: { start, end }`: the layout is computed only for that window. Chrono exposes the full counts and offsets so any virtualizer the **app** installs can drive the windows. No virtualizer ships with Chrono (02 §2.8) (decided, §12.3) | Hundreds of resources × hour slots stay fast, without choosing a virtualization library for the app |
| R15 | Scroll to time | `scrollToTime(time, { behavior? })` action for time grids and timelines (DOM: scrolls the slot `[data-slot-start]` into view inside the scroll container). Option `initialScrollTime` applies once after mount | Timelines and long days start at a useful position, e.g. 08:00 or now |

---

## 2. Core

### 2.1 Files

```text
packages/core/src/calendar/
├── resources/
│   ├── types.ts             # resource input, normalized tree, row/column descriptors
│   ├── tree.ts              # parentId → tree, collapse, visible order, levels
│   ├── resource-time-grid.ts# R5 columns + per-column 05 E8 layout
│   ├── timeline-axis.ts     # R6 slots and multi-level header cells
│   ├── timeline-layout.ts   # R7 lanes per row, left/width
│   ├── windowing.ts         # R14 windows, offsets, counts
│   └── views.ts             # resourceViews pack (R3, R4): definitions + layout registration
├── navigation/
│   └── zoom.ts              # R8
└── interaction/
    ├── drag-geometry.ts     # extended: resource targets (R11)
    └── selection.ts         # extended: resourceId, clamp (R12)
```

**Layout registry (R4).** `ViewDefinition.layout` is resolved through a small registry. The
base calendar registers `month`, `time-grid` and `list`. `resourceViews` registers
`resource-time-grid` and `timeline` when the app passes it in `views`. Unknown layouts throw in
development with a message naming the pack to import.

### 2.2 Controller additions

```ts
resources?: readonly TResource[];
getResourceLabel?: (r: TResource) => string;
resourceGrouping?: "resource-first" | "date-first";
collapsedResourceIds?: readonly (string | number)[]; defaultCollapsedResourceIds?: …;
onCollapsedResourceIdsChange?: …;
getResourceWorkingHours?: (r: TResource, date: PlainDate) => readonly { start: TimeInput; end: TimeInput }[];
allowResourceChange?: boolean;
zoomLevels?: readonly string[];
resourceWindow?: { start: number; end: number };
slotWindow?: { start: number; end: number };
initialScrollTime?: TimeInput;
```

State gains `resources` (visible rows/columns with `level`, `expanded`, `hidden`), `axis`
(timeline slots and header rows), `window` (counts, offsets), `zoomIndex`. Actions:
`toggleResource(id)`, `zoomIn()`, `zoomOut()`, `scrollToTime(time)`.

Attributes (additions):

| Element | Attributes |
| --- | --- |
| Resource column header / row header | `role="columnheader"` / `"rowheader"`, `aria-label` (resource label), `data-resource-id`, `data-level` |
| Group header (time grid) | `role="columnheader"`, `aria-colspan`, `data-resource-group` |
| Timeline row | `role="row"`, `aria-level`, `aria-expanded` (groups), `data-resource-id`, `data-collapsed`, `--chrono-row-lanes` |
| Timeline header cell | `role="columnheader"`, `aria-colspan`, `data-header-level` (`day`, `hour` …) |
| Slot / cell | adds `data-resource-id`, per-resource `data-working-hours` |
| Event | adds `data-resource-id` (the resource of this piece), timeline `--chrono-event-left` / `--chrono-event-width` |
| Timeline root | `role="treegrid"` when grouped, else `grid`; `aria-rowcount` / `aria-colcount` with the **full** counts when windowed (R14) |

---

## 3. Adapters

New parts (React, Vue, Svelte):

| Part | Default element | Notes |
| --- | --- | --- |
| `CalendarResourceHeader` | `div` | Resource column header (resource time grid). Children/slot receive the resource |
| `CalendarResourceGroupHeader` | `div` | Group header spanning children |
| `CalendarTimeline` | `div` | Timeline root |
| `CalendarTimelineHeaderRow`, `CalendarTimelineHeaderCell` | `div` | Multi-level time header |
| `CalendarTimelineRow`, `CalendarTimelineRowHeader` | `div` | One resource or group row |
| `CalendarTimelineCell` | `div` | One slot in a row |

Events, "+N more", previews and handles reuse the plan 05/09 parts. `resourceViews` is a plain
data export (no `"use client"`, 04 C13). Vanilla: same delegated listeners; templates stamp the
new attributes.

---

## 4. Tests

Core (four `TZ` zones):

| File | Proves |
| --- | --- |
| `resources/tree.test.ts` | Tree from `parentId`, cycles and missing parents reported in dev, collapse/expand, visible order |
| `resources/resource-time-grid.test.ts` | Both groupings, multi-resource events in each column, per-column overlap layout (golden fixtures) |
| `resources/timeline-axis.test.ts` | Slots and header spans for each built-in, custom slot durations, DST days (05 E9) |
| `resources/timeline-layout.test.ts` | Lanes per row (golden fixtures), left/width, clipping at range edges, continuation flags |
| `resources/invariants.test.ts` | Seeded random data: no two events share a lane in a row at the same time; every event in range appears once per listed visible resource; collapsed resources produce no pieces |
| `resources/windowing.test.ts` | Windows give the same pieces as the full layout restricted to the window; counts and offsets |
| `navigation/zoom.test.ts` | Zoom in/out keeps the focused date in view |
| `interaction/*` (extended) | Cross-resource moves (single and multi-resource events), `allowResourceChange`, selection clamped to one resource, keyboard moves across resources |
| `bench.test.ts` (extend) | 200 resources × 1 week timeline × 2,000 events, windowed to 30 rows: < 30 ms. Report only |

Adapters: `calendar-resources` (both groupings), `calendar-timeline` (header rows, lanes,
zoom), `calendar-treegrid-keyboard` (R10), `calendar-resource-drag`, `calendar-windowing`
(window props applied, full ARIA counts), parity, no-styles, SSR, and a bundle test proving the
base `Calendar` without `resourceViews` reaches no `resources/` files (R4).

Manual a11y: VoiceOver + NVDA on the grouped timeline (treegrid) and resource day view.

---

## 5. Size budgets

| Entry | Ceiling (gzip) |
| --- | --- |
| `core/calendar` without the pack | unchanged: 19 KB (plan 09) |
| `core/calendar` + `resourceViews` | 26 KB |
| `<adapter>/calendar` without the pack | unchanged: 40 KB |
| `<adapter>/calendar` + `resourceViews` | 50 KB |

`check-size.mjs` gains a "with pack" entry that imports `resourceViews`.

---

## 6. Examples

- **Room booking** (resource day view, rooms as columns, `resource-first`), creating bookings
  per room, moving bookings between rooms with a capacity rule in `validateEventChange`.
- **Staff scheduler** (timeline week, departments → people, collapsible groups, zoom between
  day/week/month, per-person working hours).
- **Large timeline** (500 resources) using a virtualizer that the **example installs** (e.g.
  TanStack Virtual) to drive `resourceWindow`; no Chrono package depends on it (02 §2.8).
- All styling in each example's CSS.

---

## 7. Docs and agent files

- Adapter READMEs (EN/VI/CN): resources section — `resourceViews` import, resource input,
  multi-resource events, both groupings, timeline definitions and header rows, zoom, collapse,
  keyboard tables (treegrid), cross-resource proposals, windowing recipe, `scrollToTime`.
- `skills/chrono-*.md`: "room booking" and "staff timeline" steps.
- `.agents/AGENTS.md` + skill: the layout registry rule (new layouts ship as opt-in packs),
  §4 invariants.

---

## 8. Delivery (PR breakdown)

| PR | Content |
| --- | --- |
| 1 | `resources/types`, `tree`, `resource-time-grid` + layout registry + tests |
| 2 | `timeline-axis`, `timeline-layout`, `windowing`, `zoom` + tests + benchmark |
| 3 | `resourceViews` pack, controller additions, interaction extensions, attributes |
| 4 | React |
| 5 | Vue |
| 6 | Svelte |
| 7 | Vanilla + parity |
| 8 | Examples, docs, size budgets. Version `0.6.0` |
| Release | Manual `0.6.0` on `latest` (04 §9 Release) |

PRs 5–7 can run in parallel after PR 4.

---

## 9. Definition of done

- All checks pass; examples build (the large-timeline example builds with its own virtualizer
  dependency, which `check:deps` ignores because examples are not checked).
- F8 acceptance covered by core and adapter tests; §4 invariants pass on 1,000 seeded sets.
- The base `Calendar` bundle without `resourceViews` contains no resource code.
- Parity identical across adapters; manual screen-reader check recorded.

---

## 10. Changes to earlier plans

- **05:** `SelectionProposal` gains `resourceId` (R12).
- **09:** `EventChangeProposal` `from` / `to` gain `resourceIds` (R11).
- **04:** view layouts are resolved through a registry (R4); the three base layouts are
  registered by default. No behavior change.
- **02 §4:** vocabulary gains `data-resource-id`, `data-resource-group`, `data-collapsed`,
  `data-header-level`; layout properties gain `--chrono-event-left`, `--chrono-event-width`,
  `--chrono-row-lanes`.

---

## 11. Out of scope

- Availability shading, blocked periods, closed days (plan 11).
- Resource management (create/edit/delete resources), capacity rules, conflict resolution —
  the app's job (BRD §11).
- Dragging resources to reorder them; resizing columns or rows (app CSS / app UI).
- Shipping or recommending a specific virtualizer.

---

## 12. Open questions

1. ~~**Opt-in view pack**~~ — **decided: opt-in.** Resource layouts load only when the app
   imports `resourceViews` (R4).
2. ~~**Multi-resource events**~~ — **decided: support lists now.** `resourceId` accepts one id
   or an array (R2); moves replace only the dragged-from resource (R11).
3. ~~**Windowing**~~ — **decided: ship windows.** `resourceWindow` / `slotWindow` plus counts and
   offsets; the app brings its own virtualizer (R14).

All open questions are decided.

---

## 13. Implementation guide (added after stages 1–2 shipped)

Read [`00-conventions-as-built.md`](00-conventions-as-built.md), [`05-event-layout.md`](05-event-layout.md) §13 and
[`09-drag-resize.md`](09-drag-resize.md) §13 first. In this plan the *decision* ids are `R1…R15`, so the
reconciliations below use the prefix **IG** (implementation guide) to avoid a clash. Decisions R1–R15 stay
unless a bullet says otherwise.

### 13.1 Reconciliations with the as-built code

| # | Problem | Resolution |
| --- | --- | --- |
| IG1 | **No layout registry exists.** `calendar-controller.ts` picks the layout with a three-way ternary on `definition.layout` (`month` / `time-grid` / `list`). R4 describes a registry that apps extend by importing a pack, but a **global** registry would be a module side effect (breaks `sideEffects: false` and the "no work at import" test). | Make layout building **data-driven, not global**: widen `ViewLayout` to `"month" \| "time-grid" \| "list" \| (string & {})` and give `ViewDefinition` an optional non-serializable field `layoutBuilder?: (ctx: LayoutContext, options) => unknown`. The controller uses `definition.layoutBuilder ?? builtIn[definition.layout]`. `resourceViews` is a plain object of `ViewDefinition`s whose `layoutBuilder` references the resource layout functions, so importing the pack is the **only** way resource code enters a bundle. Unknown layout without a builder throws in development with "import `resourceViews` from `@zealakit/chrono-<fw>/calendar` and pass it as `views`". `resolveViews` and `assertDefinition` must keep accepting these fields; the state comparer (05 R1) ignores functions. |
| IG2 | **Reachability test cannot prove R4.** The `/calendar` entry re-exports `resourceViews`, so the static import graph of the entry **does** reach `resources/` files. | Replace that assertion by a **bundle test**: bundle (esbuild, same options as `check-size.mjs`) a tiny entry that imports only `Calendar` and use `metafile.inputs` to assert no path under `calendar/resources/` is included; bundle a second entry that also imports `resourceViews` and assert they are. Keep a static check that `resources/views.ts` has no top-level side effects. |
| IG3 | **`check-size.mjs` discovers only `index.js` entries.** The "with pack" entries (§5) have no file. | Add synthetic entries to `discoverEntries()`: `core/calendar+resources`, `<adapter>/calendar+resources`, built from esbuild `stdin` (`contents: 'export * from "<entry>"; import "<entry>"'` is **not** enough because `export *` keeps everything — use named imports `Calendar`, `resourceViews`, `CalendarTimeline`, … so tree-shaking measures the real app). Budgets: `+resources` 26 KB (core) and 50 KB (adapter). The base entries keep the plan-09 ceilings. |
| IG4 | **Cell-key collisions across resources.** 05 R3 defines slot keys `YYYY-MM-DDTHH:mm`; in a resource time grid several columns share the same date and time. | Cells in resource views use `data-chrono-key = <base>@<encodeURIComponent(resourceId)>` (e.g. `2026-11-17T09:00@room%20A`). `parseCellKey` gains `resourceId?` and kinds `"timeline-slot"` (`<slotStartISO>@<id>`) and `"timeline-row"` (`row:<id>`). `focusDateCell`/`syncRovingTabIndex` need no change. Never put raw ids in keys (`@`, quotes). Month cells never carry a resource. |
| IG5 | **Multi-resource pieces (R2).** One event appears in several columns/rows; keys and selection must not clash. | Segment key becomes `${eventId}:${resourceKey}:${firstDayKey}`; `selectedEventId` highlights **all** pieces of the event (`data-selected` on each); focus/interaction state uses the segment key. For drags (R11): replace only the dragged-from resource in the list; if the target resource is already in the list the list is de-duplicated (the event simply loses the dragged-from resource). Table-test: `[A,B]` drag A→C = `[C,B]`; `[A,B]` drag A→B = `[B]`; `[A]` drag A→A = unchanged (no proposal). |
| IG6 | **Default accessible names.** `getResourceLabel` is optional but headers need names. | Default `aria-label` = `String(resource.id)` (documented as a fallback only); never assume `name`/`title` fields. |
| IG7 | **Option plumbing.** 12 new options (`resources`, `resourceGrouping`, `collapsedResourceIds` (+default/onChange), `getResourceLabel`, `getResourceWorkingHours`, `allowResourceChange`, `zoomLevels`, `resourceWindow`, `slotWindow`, `initialScrollTime`). | New-option checklist (00 §3). Arrays/`Record`s are JSON-safe except `resources`, which holds app objects: compare by reference/memoized layout (05 R1), never JSON. `collapsedResourceIds` goes through `createControllable` with an array `equals`. |
| IG8 | **Generics.** `TResource` must flow into render callbacks like `TEvent` (05). | React: generic `forwardRef` wrappers need a cast helper (`forwardRefGeneric`) in `shared/`; Vue/Svelte document `unknown`-typed slots plus a typed helper. Add a `tests/types/` check (compiles, no `any` leaks). |

### 13.2 Specs with worked examples

**Resource tree (`tree.ts`).** Input flat list → normalized nodes `{ resource, id, parentKey | null, level,
index, children[] , expanded }`. Roots are items whose `parentId` is `undefined`/`null` **or missing in the
list** (dev warning once: "unknown parentId"). Cycles (a→b→a) are broken by dropping the back edge with a dev
warning; duplicates of `id` keep the first. Visible order = depth-first by array order; collapsed groups hide
descendants, and descendants' events are not laid out. A node is a **group** when it has children.

**Resource time grid columns (R5).** `resource-first`: for each visible leaf resource, for each visible day →
column (`columnIndex` increments). `date-first`: for each day, for each leaf resource. Group headers span the
leaf columns beneath them (`aria-colspan`). Example: resources `Building` → rooms `A`, `B`; week view Mon–Fri,
`resource-first`: columns = 2 rooms × 5 days = 10; group header `Building` spans 10; each room header spans 5
day columns. Each column is laid out independently with the stage-3 algorithm and gets its own all-day cell
(`data-resource-id` on the column's cells and pieces).

**Timeline axis (R6) — fixtures.** `slotDuration` is `{ minutes }`, `{ days }` or `{ weeks }`; `headerRows` is
an ordered list of units from `["month","week","day","hour","minute"]` (coarser first). Cell spans =
number of axis slots inside the header cell's unit.

| definition | axis slots | header rows → cells |
| --- | --- | --- |
| `timelineDay`: 1 day, `{minutes: 60}`, `["day","hour"]` | 24 (23/25 on DST days) | row 1: 1 cell spanning 24; row 2: 24 cells |
| `timelineWeek`: 7 days, `{days: 1}`, `["week","day"]` | 7 | row 1: 1 cell spanning 7; row 2: 7 |
| `timelineMonth`: Nov 2026, `{days: 1}`, `["month","day"]` | 30 | row 1: 1 cell spanning 30; row 2: 30 |
| 3-day custom, `{minutes: 30}`, `["day","hour"]` | 144 | row 1: 3 × span 48; row 2: 72 × span 2 |

Positions (fractions of the **whole visible axis**): an event 09:00–10:30 on a one-day, 60-minute axis:
`left = 9/24 = 0.375`, `width = 1.5/24 = 0.0625`. A multi-day event clipped by the range edge gets
`left = 0` (or `left + width = 1`) and `continuesBefore/After`. On DST days the axis is **wall-time** (05 E9):
New York 2026-03-08 has 23 hourly slots (no 02:00); the repeated hour on 2026-11-01 is one slot with two
overlapping pieces.

**Timeline lanes (R7).** Per row, apply the 05 E6 comparator and first-fit packing on the continuous axis
using half-open intervals (touching events share a lane). `--chrono-row-lanes` = number of lanes (≥ 1 even
for empty rows, so the row keeps a height); `--chrono-event-lane` = lane index. Group rows contain no events.

**Windowing (R14).** `resourceWindow {start,end}` is **half-open over visible rows/columns** (`[start,end)`,
clamped to the count). State exposes `{ totalRows, totalColumns, rowOffset, columnOffset }`; rendered rows get
`aria-rowindex = absoluteIndex + 1 + headerRowCount`, root `aria-rowcount` = full count + header rows (same for
columns with `slotWindow`). Invariant test: for any window, pieces equal the full layout restricted to rows
inside it (compare by segment key); layout work for rows outside the window is skipped (assert by counting
calls to the row layout function with a spy).

**Zoom (R8).** `zoomIn()` moves to the previous id in `zoomLevels` (finer), `zoomOut()` the next; anchor = the
focused date; the range is recomputed around it by the target definition. At the ends it is a no-op.

**Timeline keyboard (R10).** Cells are the focus unit; state `focus.cellKey` uses the IG4 keys. ↑/↓ move to
the previous/next *visible* row (collapsed groups' children are skipped); ←/→ previous/next slot (swapped in
RTL); Home/End first/last slot of the row; PageUp/PageDown previous/next range (`navigate`); on a **group
row**, ← collapses an expanded group (else moves to the parent), → expands a collapsed group (else moves to
the first child) — standard treegrid; Enter into cell and Shift+arrows work as in 05/09.

### 13.3 Test-support additions

- Golden fixtures (hand-written): `fixtures/resources/{tree,resource-grid,timeline-axis,timeline-layout}-*.json`;
  oracle in `tests/support/oracle.ts` extended with a naive per-row lane packer (as in 05 §13.4).
- Seeded random data generator for resources (trees up to depth 3, 1–50 resources) and events (1–200,
  multi-resource) shared by the invariants.
- A `tests/support/virtual.ts` stub that mimics an app virtualizer (computes windows from a scroll offset) used
  by the adapter windowing tests; no real virtualizer is a dependency of any package.
- Parity scenarios: `resource-day`, `resource-week-grouped`, `timeline-week`, `timeline-collapsed`,
  `resource-drag-preview`.

### 13.4 PR task list

| PR | Files | Done when |
| --- | --- | --- |
| 1 | `ViewDefinition.layoutBuilder` + controller dispatch (IG1), `resources/{types,tree,resource-time-grid}.ts`, IG4 key support | stage-2…3 tests untouched and green; tree/grid fixtures green ×4 zones |
| 2 | `timeline-axis`, `timeline-layout`, `windowing`, `zoom`, benchmark | axis table and lane fixtures green; windowing invariant; bench printed |
| 3 | `resources/views.ts` pack, controller options/state/attributes, interaction extensions (R11, R12), `check-size` synthetic entries (IG3), bundle test (IG2) | base bundle contains no `resources/`; `+resources` budgets enforced |
| 4–7 | React → Vue → Svelte → Vanilla parts + tests + parity | suites green; `resourceViews` is a data export (no `"use client"`) |
| 8 | Examples (room booking, staff timeline, large timeline with an **example-installed** virtualizer), docs, version `0.6.0` | full routine in 00 §5; examples build |

### 13.5 Pitfalls checklist

- `resourceViews` must live in a module with **no** top-level code and no barrel that runs code; exporting it
  from the entry must not make the base bundle bigger (the bundle test proves it).
- Do not mutate `resources` or `events`; the tree is derived state, memoized on array identity.
- Events without a resource are dropped in resource views with a **single** development warning (not per
  render).
- Key encoding: always `encodeURIComponent` ids; decode in `parseCellKey`; test ids with spaces, `@`, `"` and
  unicode.
- Timeline rows and header rows need stable `aria-rowindex`/`aria-colindex` even when windowed; test the full
  counts.
- Keep per-resource working hours as slot state only (`data-working-hours`); availability shading is plan 11.
- A "selection stays in one resource" clamp (R12) must hold for keyboard Shift+arrows too (they never change
  the resource).
