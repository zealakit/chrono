# Plan: stage 3 — Event experiences (`/calendar`, events) — part 3 of 4

> Part 3 of 4 of [`05-event-layout.md`](05-event-layout.md) (the index: scope, status and the part table). Section numbers (`§N`) are unchanged by the split. Shared rules: [`00-conventions-as-built.md`](00-conventions-as-built.md).

## 5. Tests

Core (four `TZ` zones, 03 §5):

| File | Proves |
| --- | --- |
| `events/normalize.test.ts` | Value parsing, zone conversion, swap, duplicates, filtering to range, hidden-day clipping, memoization |
| `events/month-layout.test.ts` | Golden fixtures (`tests/fixtures/events/month-*.json`: input + expected segments) for week splits, lanes, continuation flags, all 7 `weekStartsOn` values |
| `events/overflow.test.ts` | Limits 1–5, multi-day pieces split at hidden lanes, `more` counts |
| `events/time-grid-layout.test.ts` | Golden fixtures for clusters, columns, expansion, `minEventDuration`, midnight splits, E5 threshold, clipping to `dayStart`/`dayEnd` |
| `events/dst.test.ts` | New York 2026-03-08 and 2026-11-01, Lord Howe 2026-04-05 and 2026-10-04: E9 behavior, no NaN/negative heights |
| `events/invariants.test.ts` | Seeded random event sets (no library): no two month pieces share a lane on the same day; no two time-grid events overlap in the same column; expansion never covers a colliding event; every input event that is in range appears exactly once per covered visible day (visible or counted in `more`) |
| `events/agenda-layout.test.ts` | Groups, multi-day repeats, empty days on/off |
| `interaction/selection.test.ts` | Start/extend/confirm/cancel, snapping, continuous ranges across days both directions (dragging backwards swaps), per-day preview pieces incl. hidden days and DST days, Shift+←/→ keeps the time, `maxSelectionDuration`, `validateSelection` blocking confirm, controlled `selection` |
| `interaction/event-focus.test.ts` | Both modes and every key in §2.5 for month, time grid (slots + all-day row) and agenda; Enter precedence order; Shift+Enter; wrapping; return to navigation on prev/next or when the event disappears; RTL arrows in navigation mode |
| `foundation/ticker.test.ts` | Minute alignment, midnight rollover, no timer when `now` is passed (fake timers via `node:test` mock timers) |
| `foundation/announcer.test.ts` | Lazy creation, single shared region across two core copies, app-provided element |
| `bench.test.ts` (extend) | 1,000 events in a week, 300 events in a month. Report only |

Adapters (each of React, Vue, Svelte, Vanilla):

| File | Proves |
| --- | --- |
| `calendar-events.test.ts` | Rendering in month, time grid, agenda; custom properties present; app fields reach render callbacks |
| `calendar-event-keyboard.test.ts` | Single tab stop, Enter/F2 into a cell, Tab wraps inside the cell, Escape back, Space selects, Enter activates, Shift+Enter activates the date, only one `tabindex="0"` at any time |
| `calendar-selection.test.ts` | Pointer selection with a stubbed `hitTest`, long press on touch, keyboard Shift+arrows/Enter/Escape, `onSelectRange` payload |
| `calendar-overflow.test.ts` | Numeric limit, `"auto"` with a stubbed `ResizeObserver`, `onMoreActivate` |
| `parity.test.ts` (extend) | New scenarios in `tests/fixtures/calendar-parity.json` for events and selection; identical snapshots across adapters |
| `ssr.test.ts` (extend) | Server render with events + `now` equals the client's first render; no ticker started on the server |
| `no-styles.test.ts` (extend) | Event elements carry only `--chrono-*` properties in `style` |

Manual a11y check: VoiceOver and NVDA on the React example — entering and leaving cells,
event counts announced, selection announcements, "+N more".

---

## 6. Size budgets

`size-budgets.json` ceilings are raised in this plan (04 §6 rule: a plan change is required):

| Entry | Stage 2 ceiling | Stage 3 ceiling (gzip) |
| --- | --- | --- |
| `core/foundation` | 10 KB | 11 KB (announcer, ticker) |
| `core/calendar` | 6 KB | 14 KB |
| `<adapter>/calendar` (incl. reached core) | 20 KB | 32 KB |

Budgets inside the ceilings are re-measured +15 % as in 04 §6.

---

## 7. Examples

The "Outlook-like shell" from stage 2 gets events:

- A static data set generated relative to today (meetings, overlaps, multi-day trip, all-day
  holiday, a recurring stand-up as expanded occurrences, a zero-length reminder).
- "+N more" opens the browser's native `<dialog>` (owned by the example; no UI library).
- Drag-to-create in week view opens an inline form in the example; saving adds the event to
  the example's own state (shows that persistence is the app's job). Keyboard creation works
  the same way.
- Selected event details in a side panel; Enter opens the "edit" form.
- Next.js: server-rendered events with `now` passed from the server.
- All CSS stays in each example's `styles.css` (02 §2.8). One example uses absolute
  positioning with the custom properties, another uses CSS grid, to show both are possible.

---

## 8. Docs and agent files

- Adapter READMEs (EN/VI/CN): events section (input shape, all-day **exclusive** end
  (with a one-day example) and `fromInclusiveEndDate`, the difference from inclusive picker
  ranges, time zones), parts table, layout custom properties table, keyboard
  table (Enter into cell, Shift+Enter), selection and proposals, `"auto"` limit and its SSR note, live clock
  and `now`.
- 0.3.0 changelog section in each README: the behavior changes from stage 2 — slots
  focusable, day headers not (E13); Enter on a cell with events enters the cell, Shift+Enter
  activates the date (E11).
- Root README: "0.3.0 — Calendar views + events".
- `skills/chrono-*.md`: rendering events, the keyboard model, creating events by selection.
- `.agents/AGENTS.md` + skill: layout invariants (§5) as hard rules for future changes; scope
  line "events shipped (stage 3)".

---

## 9. Delivery (PR breakdown)

| PR | Content |
| --- | --- |
| 1 | `events/types`, `normalize`, `sort`, `month-layout`, `overflow` + golden fixtures + invariants |
| 2 | `all-day-row`, `time-grid-layout`, `now-indicator`, DST tests, benchmark |
| 3 | `agenda-layout`, `interaction/event-focus`, `interaction/selection` |
| 4 | Foundation `ticker` + `announcer`; controller additions, attribute getters, `pointer`/`hit-test`; size budgets |
| 5 | React |
| 6 | Vue |
| 7 | Svelte |
| 8 | Vanilla + parity fixtures complete |
| 9 | Examples, READMEs (EN/VI/CN), skills, agent files. Version `0.3.0` |
| Release | Same manual steps as 04 §9 Release: checks, tarball inspection, the **maintainer** publishes `0.3.0`, tag `v0.3.0`, GitHub release notes including the E13 change |

PRs 5–8 can run in parallel after PR 4.

---

## 10. Definition of done

- `pnpm build`, `typecheck`, `test`, `lint`, `check:deps`, `check:domains`, `check:size`,
  `readme:check`, `pack:packages` exit 0. All examples build, including Next.js SSR.
- F3, F4, F5, F6 acceptance (02 §5) covered by core and adapter tests; all §5 invariants pass
  on 1,000 seeded random sets per run.
- Parity snapshots identical across the four adapters.
- Benchmarks recorded in the PR; manual screen-reader check recorded.
- After publishing: fresh-project smoke test of `0.3.0` per framework (04 §10).

---

## 11. Out of scope (later stages)

- Moving, resizing, dragging events, auto-scroll while dragging, cross-resource moves (stage
  5, F7).
- Resources, timeline, availability backgrounds, recurrence expansion (stage 5, F8–F10).
- A "stacked" overlap mode (E8) — candidate for stage 5
  if users ask.
- Any popup for "+N more" or event details (02 §2.8; examples only).

---

## 12. Open questions

1. ~~**Event keyboard model**~~ — **decided: Enter into cell** (APG interactive-cell pattern,
   one tab stop per view). Key tables in §2.5.
2. ~~**All-day end date**~~ — **decided: exclusive** (iCal/Google/FullCalendar style). Helper
   `fromInclusiveEndDate` for other data. Picker ranges stay inclusive (E3).
3. ~~**Time-grid range creation**~~ — **decided: across days**, as one continuous timed range
   from anchor to pointer (E14).

All open questions are decided.

---
