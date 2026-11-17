# Plan: stage 5b — Resource calendar and resource timeline (`/calendar`) — part 1 of 2

> Part 1 of 2 of [`10-resources.md`](10-resources.md) (the index: scope, status and the part table). Section numbers (`§N`) are unchanged by the split. Shared rules: [`00-conventions-as-built.md`](00-conventions-as-built.md).

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
