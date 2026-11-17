# Plan: stage 5a — Move and resize events (`/calendar`) — part 2 of 2

> Part 2 of 2 of [`09-drag-resize.md`](09-drag-resize.md) (the index: scope, status and the part table). Section numbers (`§N`) are unchanged by the split. Shared rules: [`00-conventions-as-built.md`](00-conventions-as-built.md).

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
