# Plan: stage 5b — Resource calendar and resource timeline (`/calendar`) — part 2 of 2

> Part 2 of 2 of [`10-resources.md`](10-resources.md) (the index: scope, status and the part table). Section numbers (`§N`) are unchanged by the split. Shared rules: [`00-conventions-as-built.md`](00-conventions-as-built.md).

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
