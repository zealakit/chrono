# Plan: stage 5a — Move and resize events (`/calendar`)

Status: **proposal — not implemented**.

Order: **9 of N**. First stage-5 plan. Stage 5 of `02-implement-business-flow.md` §9 is
split into four plans: **09 drag and resize (F7)**, `10-resources.md` (F8),
`11-availability.md` (F9), `12-recurrence.md` (F10), then `13-ecosystem.md` (stage 6). Runs
after `08-datetime.md` (`0.4.0` on `latest`).

Goal: let users move and resize events in month, week, work week, day and the time-grid
all-day row, by pointer, touch and keyboard. Chrono computes the preview, snapping and
validity and emits a **proposal**; the app decides and persists (02 §2.4, BRD §11).

**Scope rule:**
- Calendar domain only, same `/calendar` entry.
- Builds on plan 05: event layout, hit testing by attributes (E17), touch long press (E18),
  the Enter-into-cell keyboard model (E11), the announcer (E20), the selection rules (E14,
  E16).
- Resources (moving between resource columns) arrive in plan 10, which extends the proposal
  defined here. Recurrence scope ("this / following / all") arrives in plan 12.
- No styling (02 §2.8): previews and handles are the app's elements; Chrono only sets
  state attributes and `--chrono-*` positions.
- Signatures below are **shapes** (TypeScript as spec, not code).

---

## 1. Decisions taken in this plan

| # | Topic | Decision | Why |
| --- | --- | --- | --- |
| M1 | What can be edited | Calendar option `editable` (default `false`). Per event, the input may set `editable`, `movable`, `resizable` (`false` wins over the calendar option). An `isEventEditable(event, kind)` callback overrides both | Read-only stays the default. Permissions are app data, read per event |
| M2 | Proposal | `onEventChange(proposal)` with `{ kind: "move" \| "resize-start" \| "resize-end"; event; from: { start, end, allDay }; to: { start, end, allDay }; source: "pointer" \| "keyboard" }`. Values use the same types the event used (plain or zoned, 05 E2); `end` is half-open, and exclusive for all-day (05 E3) | One payload for every edit. Plan 10 adds `from.resourceIds` / `to.resourceIds` (10 R11); plan 12 adds `recurrence` data; the app chooses the scope (12 RR8) |
| M3 | Accept / reject | `onEventChange` may return `void`, `boolean` or `Promise<boolean>`. `false` or a rejected promise = **reject**: the event snaps back. Anything else = **accept pending**: Chrono keeps a pending piece at the new position (`data-pending`) until the app's `events` array contains the new times, the promise resolves `false`, or `pendingTimeout` (default 10 s) passes — then it shows what `events` says (decided, §12.2) | No flicker during async saves, while `events` stays the single source of truth |
| M4 | Move | Drag the event body. Duration is kept. Time grid: snaps to `snapDuration` (default = `slotDuration`), moving across day columns keeps the pointer's time. Month and all-day row: snaps to days, keeps each event's time of day | Matches mainstream calendars |
| M5 | Resize | Drag a resize handle the app renders inside the event: any element with `data-chrono-resize="start"` or `"end"` (part `CalendarEventResizeHandle`). Time grid: vertical, snapped to `snapDuration`. Month and all-day row: horizontal, snapped to days. A resize never makes `end ≤ start`: it stops at one snap unit (one day for all-day) | Handles stay the app's markup and size. No inverted events |
| M6 | All-day conversion | Moving a timed event into the all-day row makes it all-day (the day it lands on, same number of days rounded up); moving an all-day event into the timed area makes it timed with `defaultTimedDuration` (default 60 min). Option `allowAllDayConversion` (default `true`) | F7 "cross-view moves (time grid ↔ all-day row)" |
| M7 | Start of a drag | Primary pointer button only. The drag starts after the pointer moves **4 px** (below that it is a click: select / activate, 05 E12). Touch: 400 ms long press (05 E18). A drag on an **event** moves it; a drag on an **empty slot** selects a range (05 E14) | Clicks keep working; the two drags never compete |
| M8 | Validation while dragging | `validateEventChange(proposal) → boolean`, synchronous, runs on every preview step (same rule as 05 E16). Invalid preview: `data-invalid`; dropping it cancels without calling `onEventChange` | Instant feedback; async checks happen in the app after the drop |
| M9 | Preview | During a drag the original pieces get `data-dragging`; a preview is rendered **per covered day** (`CalendarEventDragPreview`, split with `splitIntervalByDay` like the selection preview) with `data-drag-preview`, `data-invalid`, continuation flags and the E10 position properties | The app decides how the original and the preview look |
| M10 | Keyboard | In interaction mode on an editable event (05 E11): **`M`** starts a keyboard move, **`R`** a resize of the end, **`Shift+R`** a resize of the start. Arrows then move or resize the preview (↑/↓ by `snapDuration` in time grids, ←/→ by one day; in month view all arrows move by days, ↑/↓ by a week). **Enter** drops (proposal with `source: "keyboard"`), **Escape** cancels. The keys are listed in `aria-keyshortcuts` and configurable via `keyboardShortcuts`. Apps can also call `startMove(eventKey)` / `startResize(eventKey, edge)` from their own menu (decided, §12.1) | Full keyboard parity for every pointer edit (02 §7), without hijacking arrows in normal navigation |
| M11 | Announcements | Through the shared announcer (05 E20): start ("Moving Team sync, Tuesday 10:00 to 11:00"), new position (throttled to one per 500 ms while dragging, every step in keyboard mode), drop ("Moved to Wednesday 14:00 to 15:00"), reject ("Change cancelled"), invalid ("Not allowed here"). The event name comes from `getEventLabel` (05) | Screen-reader users hear where the event goes |
| M12 | Auto-scroll | While a pointer drag or range selection is near an edge (40 px) of the scroll container, Chrono scrolls it with `requestAnimationFrame`, faster closer to the edge (max 20 px per frame). Scroll container = `scrollContainer` option, else the nearest scrollable ancestor of the grid. `autoScroll: false` turns it off | F7 auto-scroll; also fixes long selections from plan 05 |
| M13 | One drag at a time | The active drag is page-global (`getGlobalState`, 03 §3.7), so two calendars or two core copies never drag at once. A second pointer during a drag is ignored | Multi-touch and nested calendars stay safe |
| M14 | Cancellation | Escape, `pointercancel`, window blur, or the event disappearing from `events` cancels the drag (no proposal) | Predictable on interruptions |
| M15 | Dropping outside | Releasing outside the grid cancels. Dragging over prev/next to change the visible range is **not** in this plan (decided, §12.3) | Keeps the first version simple |

---

## 2. Core: `calendar/interaction/` additions

### 2.1 Files

```text
packages/core/src/calendar/interaction/
├── drag-state.ts      # pure machine: idle → pressed → dragging → pending | idle (M3–M9, M14)
├── drag-geometry.ts   # pure: hit target + origin → new start/end (snap, keep duration,
│                      # resize limits, all-day conversion) for month, time grid, all-day row
├── drag-keyboard.ts   # pure: M10 keys → preview steps
├── pending.ts         # pure: match pending changes against the incoming `events` (M3)
├── auto-scroll.ts     # DOM: rAF loop; speed function is pure and tested separately (M12)
└── pointer.ts         # extended: press threshold, long press, handle detection, capture
```

`selection.ts` (05) and the new drag machine share one pointer pipeline in `pointer.ts`: the
press target decides which machine runs (M7).

### 2.2 Controller additions

`CalendarOptions<TEvent>` gains:

```ts
editable?: boolean;
isEventEditable?: (event: TEvent, kind: "move" | "resize-start" | "resize-end") => boolean;
snapDuration?: number;                 // minutes, default = slotDuration
allowAllDayConversion?: boolean;       // default true
defaultTimedDuration?: number;         // minutes, default 60
onEventChange?: (p: EventChangeProposal<TEvent>) => void | boolean | Promise<boolean>;
validateEventChange?: (p: EventChangeProposal<TEvent>) => boolean;
pendingTimeout?: number;               // ms, default 10000
autoScroll?: boolean;                  // default true
scrollContainer?: HTMLElement | null;
keyboardShortcuts?: { move?: string; resizeEnd?: string; resizeStart?: string } | false;
```

`CalendarEventInput` gains optional `editable`, `movable`, `resizable`.

`CalendarState` gains `drag: { kind; eventKey; preview: segments[]; valid: boolean;
source } | null` and `pending: { eventKey; to }[]`.

Actions: `startMove(eventKey, source?)`, `startResize(eventKey, edge, source?)`,
`updateDrag(target)`, `dropDrag()`, `cancelDrag()`, plus the keyboard steps used by
`handleEventKeyDown`.

Attributes (additions to 05 §2.6):

| Element | Attributes |
| --- | --- |
| Event | `data-editable`, `data-dragging`, `data-pending`, `aria-keyshortcuts` (when editable and shortcuts are on), `aria-description` (messages `editInstructions`, e.g. "Press M to move, R to resize") |
| Resize handle | `data-chrono-resize="start" \| "end"`, `aria-hidden="true"` (keyboard uses M10), `data-disabled` when the event is not resizable |
| Drag preview | `aria-hidden="true"`, `data-drag-preview`, `data-invalid`, `data-continues-before` / `after`, E10 position properties |
| Root | `data-dragging` while any drag is active (lets the app change the cursor or disable text selection in its CSS) |

New default messages (English only, 03 D13): `editInstructions`, `moving`, `resizing`,
`movedTo`, `resizedTo`, `changeCancelled`, `notAllowedHere`.

---

## 3. Adapters

New parts (React, Vue, Svelte):

| Part | Default element | Notes |
| --- | --- | --- |
| `CalendarEventResizeHandle` | `div` | `edge="start" \| "end"`. Rendered by the app inside `CalendarEvent` |
| `CalendarEventDragPreview` | `div` | Rendered once per covered day while dragging; children/slot receive the preview segment and the original event |

Hooks gain `getResizeHandleProps(segment, edge)` and `getDragPreviewProps(piece)`. Pointer
handling stays on the root (05 §3.2). Vanilla: the delegated root listeners detect
`data-chrono-resize` and event elements; templates stamp the new attributes with
`applyAttributes`.

No new subpath; `entries.test.ts` covers the new names.

---

## 4. Tests

Core (four `TZ` zones):

| File | Proves |
| --- | --- |
| `interaction/drag-geometry.test.ts` | Move keeps duration in month, time grid, all-day row; snapping; across days; resize limits (never `end ≤ start`); all-day ↔ timed conversion; exclusive all-day ends (05 E3); DST days in New York and Lord Howe keep wall-time positions (05 E9) |
| `interaction/drag-state.test.ts` | Press threshold vs click, long press, M7 event vs empty slot, validation blocking drop, every cancellation path (M14), one global drag (M13) |
| `interaction/pending.test.ts` | Accept via `events` update, reject via `false`, rejected promise, resolve `false`, timeout, two pending changes on different events |
| `interaction/drag-keyboard.test.ts` | M10 keys per view, configurable shortcuts, Enter/Escape, announcements content |
| `interaction/auto-scroll.test.ts` | Pure speed function by distance; loop start/stop with fake rAF |
| `interaction/invariants.test.ts` | Seeded random drags: every proposal has `start < end`, keeps duration on move, lands on snap boundaries, never changes an event that is not editable |

Adapters (React, Vue, Svelte, Vanilla): `calendar-drag` (pointer move/resize with stubbed
`hitTest`, 4 px threshold, touch long press), `calendar-drag-keyboard`, `calendar-pending`
(sync and async `onEventChange`), `calendar-auto-scroll` (stubbed scroll container), parity
(new scenarios), no-styles, SSR (no listeners on the server).

Manual a11y: VoiceOver + NVDA on keyboard move/resize and the announcements.

---

## 5. Size budgets

| Entry | Plan 05 ceiling | New ceiling (gzip) |
| --- | --- | --- |
| `core/calendar` | 14 KB | 19 KB |
| `<adapter>/calendar` (incl. reached core) | 32 KB | 40 KB |

---

## 6. Examples

The Outlook-like shell gains:
- Drag, resize, and all-day conversion with the example's own state accepting changes.
- A validation rule in the example ("cannot overlap the Focus time block") through
  `validateEventChange`.
- An async save with a fake 800 ms delay and a 1-in-5 failure, showing `data-pending` and the
  snap-back (styled in the example's CSS).
- A small "Move" item in the example's own event menu calling `startMove` (shows M10's app
  entry point).
- Non-editable holiday events (`editable: false` per event).

---

## 7. Docs and agent files

- Adapter READMEs (EN/VI/CN): editing section — enabling it, per-event flags, proposal shape,
  accept/reject/pending, validation, resize handles, keyboard shortcuts, auto-scroll, a
  persistence recipe (optimistic update + rollback in the app).
- `skills/chrono-*.md`: "make events draggable" steps.
- `.agents/AGENTS.md` + skill: §4 invariants as hard rules; "Chrono never changes `events`
  itself" as a hard boundary.

---

## 8. Delivery (PR breakdown)

| PR | Content |
| --- | --- |
| 1 | `drag-geometry` + `drag-keyboard` (pure) + tests + invariants |
| 2 | `drag-state`, `pending`, `auto-scroll`, `pointer` extensions, controller options/state/attributes, messages |
| 3 | React |
| 4 | Vue |
| 5 | Svelte |
| 6 | Vanilla + parity |
| 7 | Examples, docs, size budgets. Version `0.5.0` |
| Release | Manual `0.5.0` on `latest`, same steps as 04 §9 Release |

PRs 4–6 can run in parallel after PR 3.

---

## 9. Definition of done

- All checks pass (`build`, `typecheck`, `test`, `lint`, `check:deps`, `check:domains`,
  `check:size`, `readme:check`, `pack:packages`); examples build.
- F7 acceptance (02 §5) covered by core and adapter tests; §4 invariants pass on 1,000 seeded
  random drags per run.
- Parity identical across adapters; manual screen-reader check recorded.

---

## 10. Changes to earlier plans

- **02 §9:** stage 5 split into plans 09–12 with one minor version each (0.5.0 … 0.8.0);
  stage 6 becomes `13-ecosystem.md`.
- **02 §4:** vocabulary gains `data-editable`, `data-dragging` (already listed), `data-pending`,
  `data-drag-preview`.
- **05:** auto-scroll (M12) also applies to range selection.

---

## 11. Out of scope

- Moving between resources (plan 10) and recurrence scope (plan 12).
- Dragging to the previous/next range by hovering an edge (§12.3).
- Moving several selected events at once; copy-by-drag (Ctrl+drag).
- Dragging events in from outside the calendar (external drop sources).
- Agenda view editing (list rows have no time axis to drag along).

---

## 12. Open questions

1. ~~**Keyboard edit model**~~ — **decided: `M` / `R` / `Shift+R` modes**, arrows adjust, Enter
   drops (one proposal), Escape cancels (M10).
2. ~~**Pending model**~~ — **decided: keep a pending piece** until `events` reflects the change,
   the promise resolves `false`, or `pendingTimeout` passes (M3).
3. ~~**Edge navigation**~~ — **decided: later.** Not in this plan (M15); candidate for a later
   minor release if users ask.

All open questions are decided.

---

## 13. Implementation guide (added after stages 1–2 shipped)

Read [`00-conventions-as-built.md`](00-conventions-as-built.md) and [`05-event-layout.md`](05-event-layout.md)
§13 first. This plan **extends** the pointer pipeline, focus model, announcer, attribute/`--chrono-*`
convention and state-equality rules defined there; nothing here works until plan 05 is merged. Decisions
M1–M15 stay unless a bullet below says otherwise.

### 13.1 Reconciliations with the as-built code

| # | Problem | Resolution |
| --- | --- | --- |
| R1 | **State churn at pointer speed.** `drag.preview` changes on every animation frame; the controller recomputes state and the (05 R1) comparer walks it. | Keep the heavy layouts memoized: a drag step recomputes **only** `drag`/`pending` and the preview pieces. Throttle `updateDrag` to one call per `requestAnimationFrame`. Preview segments hold the app's event by reference (excluded from comparison, 05 R1). Add a core test: 1,000 `updateDrag` calls with an unchanged target notify subscribers once. |
| R2 | **Focus mode needs a third value.** 05 E11 has `navigation` and `interaction`; M10 adds a keyboard *editing* state (after `M`/`R`). | `focus.mode` becomes `"navigation" \| "interaction" \| "editing"`, with `editing: { kind: "move" \| "resize-start" \| "resize-end"; eventKey }` stored in `drag` (not duplicated). In `editing`, `handleKeyDown` dispatches to `drag-keyboard.ts` first (arrows/Enter/Escape), never to cell navigation. Escape returns to `interaction` on the same event. Tab/Shift+Tab while editing is ignored (consumed) so focus cannot leave mid-edit. |
| R3 | **Touch scrolling vs drag.** After a 400 ms long press the browser may still start scrolling and fire `pointercancel`. Core cannot set styles (02 §2.8). | Document and demonstrate in the examples: events (and handles) need `touch-action: none` in the **app's CSS**; the calendar scroll area keeps `touch-action: pan-y`. Core additionally registers a non-passive `touchmove` listener **only while a touch drag is active** and calls `preventDefault`. Add `data-dragging` on the root so apps can switch `touch-action` and `user-select`. Core installs a temporary `selectstart` listener (prevent default) for the duration of a pointer drag. |
| R4 | **Option/state plumbing.** 11 new options. | New-option checklist (00 §3) in all four adapters; Vue emits `eventChange`; Svelte callback props; React `CALENDAR_KEYS`. `scrollContainer` is an `HTMLElement` option: React/Vue/Svelte must accept it as a prop but **exclude it from state comparison** (it is not JSON-safe). |
| R5 | **`onEventChange` return type.** | Normalize in the controller: `void`/`undefined`/`true` → accept pending; `false` → reject; `Promise` → await; a thrown error or rejected promise = reject and `console.error` in development. Never leave an unhandled rejection. |
| R6 | **Budgets.** `core/calendar` 14 → 19 KB, adapters 32 → 40 KB. | Update `size-budgets.json` in PR 2 and re-measure. If auto-scroll or keyboard code pushes over, make `auto-scroll.ts` a separate module imported only from `pointer.ts` so unused drags tree-shake. |
| R7 | **Global drag key.** | `getGlobalState("calendar-drag", …)` with the versioned key already provided by foundation (`@zealakit/chrono-core/v1/calendar-drag`). Store only `{ owner: symbol | null }`; tests create two controller copies via `import("…?copy=a")` as in `global-state.test.ts`. |

### 13.2 Geometry specs with worked examples (hand-write them as golden fixtures)

Press-time capture: when a drag starts the controller stores `grab = { dayKey, offsetMinutes }` (time grid:
pointer time minus segment start, using the **segment**, not the whole event, for multi-day pieces) or
`{ dayOffset }` (month / all-day row: which day of the event the pointer is on, 0-based).

**Time-grid move.** Event Tue 10:00–11:00, `snapDuration 15`. Pointer pressed at 10:20 → `offset = 20`. Dropped
over Thursday at 14:07: raw start = 14:07 − 20 = 13:47 → snap to the nearest multiple of 15 → **13:45**; end =
start + original duration → 14:45. Dropped at 14:08: raw 13:48 → 13:45 (nearest); at 14:10 → raw 13:50 → 13:45;
at 14:12 → raw 13:52 → 13:45? 13:52 is closer to 13:45 (7) than 14:00 (8) → 13:45; at 14:13 → 13:53 → 14:00.
Tie (exactly halfway, e.g. raw 13:52.5 cannot occur with minute precision, but 30-minute snaps with raw :15)
rounds **up** — assert the rule in tests.
**Month move.** Event Nov 16–18 (3 days). Pointer pressed on the 2nd day (`dayOffset 1`), dropped on Thursday
Nov 26 → `start = Nov 26 − 1 = Nov 25`, `end = Nov 28` (all-day, exclusive) — the span stays 3 days. Timed
events in month keep their time of day.
**Resize (time grid).** End handle: new end = snap(pointer time) on the **pointer's day column**, clamped to
`start + snapDuration`; so dragging the end handle onto the next column extends the event past midnight.
Start handle: new start = snap(pointer time), clamped to `end − snapDuration`. All-day/month: ends move by
whole days, minimum one day.
**All-day conversion (M6).** Timed → all-day row: start = the day the pointer is over; length =
`max(1, ceil(duration / 24 h))` days (a 2 h event → 1 day; a 30 h event → 2 days). All-day → timed area: start
= the snapped pointer slot, end = start + `defaultTimedDuration`; a multi-day all-day event loses its day count
(document it in the README). `allowAllDayConversion: false` rejects the target (preview `data-invalid`).
**DST (keep real duration).** Zoned events keep their **real** duration on move; plain (wall) events keep
wall duration. Example (America/New_York): event 2026-03-07 01:00–02:00 EST moved to 2026-03-08 01:30 →
start 01:30 EST, end = start + 1 h real = 03:30 EDT (02:30 does not exist). The proposal's `to.end` is the
zoned value `03:30-04:00`; positions on the axis stay wall-time (05 E9). Add Lord Howe cases for 30-minute
shifts and the fall-back day.

**Auto-scroll speed (M12).** `speed(d) = d >= 40 ? 0 : round(20 · (1 − d / 40))` px per frame, `d` = distance in
px from the pointer to the container edge (clamped at 0). Values: `d=0 → 20`, `d=10 → 15`, `d=20 → 10`, `d=39 →
1`, `d=40 → 0`. Pure function exported from `auto-scroll.ts` and tested directly; the loop applies it
vertically and horizontally and stops when the drag ends/cancels.

**Pending matching (`pending.ts`).** A pending change `{ eventKey, to }` is *resolved* when the incoming
`events` array contains the event whose normalized `start`/`end`/`allDay` equal `to` (compare zoned values by
instant, plain by wall time, all-day by date), or when the event is gone. It is *rejected* on a `false`
result, a rejected promise, or after `pendingTimeout`. Matching runs inside `setOptions` when `events`
changes identity, not on every refresh. Two pending changes on different events are independent; a second
change to the same event replaces the first (cancel the first promise's effect by a token).

### 13.3 Keyboard editing flow (M10) — exact behavior

1. In `interaction` on an editable event press `M` (or the configured shortcut): `focus.mode = "editing"`,
   `drag = { kind: "move", source: "keyboard", preview = current position }`, announce `moving`.
2. Arrows: time grid ↑/↓ ± `snapDuration`, ←/→ ± 1 day; month and all-day ←/→ ± 1 day, ↑/↓ ± 7 days.
   Each step runs `validateEventChange`; announce the new position every step.
3. `R` = resize the end, `Shift+R` = resize the start: ↑/↓ (time grid) or ←/→ (month, all-day) change the edge;
   the other axis moves nothing. The edge never crosses the opposite edge (clamped at one snap unit).
4. Enter drops: if valid → `onEventChange({ …, source: "keyboard" })`, mode returns to `interaction`; invalid →
   announce `notAllowedHere`, stay in `editing`. Escape cancels (announce `changeCancelled`).
5. Shortcuts are matched on `event.key` case-insensitively and ignored when any of Ctrl/Alt/Meta is pressed
   (so browser shortcuts keep working); `keyboardShortcuts: false` disables them entirely and removes
   `aria-keyshortcuts`.

### 13.4 Test-support additions

- `packages/core/tests/fixtures/drag/*.json`: `{ name, view, options, event, grab, target, expected }` written by
  hand from §13.2; **never** generated from the implementation.
- `tests/support/pointer.ts` in each adapter: helpers that dispatch `pointerdown/move/up` sequences with
  `pointerId`, `pointerType`, `clientX/Y` (happy-dom lacks full `PointerEvent` defaults; set properties with
  `Object.defineProperty` as the Overlay tests do) and a stub `hitTest` returning `{ cellKey }`.
- Fake timers (`node:test` mock) for the 400 ms long press, the 500 ms announcement throttle and
  `pendingTimeout`; fake `requestAnimationFrame` for drag throttling and auto-scroll.
- Parity scenarios: `drag-preview` (mid-drag snapshot), `drag-pending`, `drag-keyboard`; the stub `hitTest`
  must be configurable per scenario in the fixture (`"hitTests": [...]`).
- A leak test: after drop/cancel/unmount no listeners remain (spy on `addEventListener`/`removeEventListener`
  counts per target).

### 13.5 PR task list

| PR | Files | Done when |
| --- | --- | --- |
| 1 | `drag-geometry.ts`, `drag-keyboard.ts`, fixtures, invariants test | fixtures pass in all four zones; invariants on 1,000 seeded drags |
| 2 | `drag-state.ts`, `pending.ts`, `auto-scroll.ts`, `pointer.ts` extension, controller options/state/attributes, messages, budgets (R6) | R1 test (notify once), R5 callback cases, global-drag test with two core copies |
| 3 | React: parts, getters, effect wiring, README stub | adapter suite green; stage-3 tests untouched |
| 4–6 | Vue / Svelte / Vanilla | suites + parity |
| 7 | Examples (incl. `touch-action` CSS), docs, version `0.5.0` | full routine in 00 §5 |

### 13.6 Pitfalls checklist

- A click must still select/activate: the 4 px threshold is measured from the **press point** in client
  coordinates; a drag that never exceeds it ends as a click and must not call `onEventChange`.
- `setPointerCapture` on the element that received `pointerdown`; release it in every end path; wrap in
  try/catch (it throws for inactive pointers).
- Never mutate the app's `events` or the input objects; proposals carry **new** value objects.
- The original pieces must keep their `tabindex` while dragging (focus must not jump); only `data-dragging`
  changes.
- An event disappearing mid-drag cancels the drag (M14) — detect in `setOptions`, not in a timer.
- During a keyboard edit announce through the shared announcer **only**; never move DOM focus into the
  preview.
- Do not add CSS cursors; set `data-dragging` on the root and let the app style.
