# Plan: stage 5a — Move and resize events (`/calendar`)

Status: **implemented in part** (core geometry, keyboard editing, pointer pipeline, auto-scroll, pending changes and the controller options, state and attributes; resize handle and drag preview parts in the four adapters with tests; not yet: parity scenarios for the drag preview, pending and keyboard editing, the example apps with `touch-action` CSS, and the `0.5.0` version bump).

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

## Parts

This plan is split so an agent can load only what it needs. **Read this index first, then only the part(s) for the task at hand.** `§N` references anywhere in the plans keep their numbering; the table maps them to files.

| Part | Contents | Size |
| --- | --- | --- |
| [`09-drag-resize-01.md`](09-drag-resize-01.md) | 1. Decisions taken in this plan; 2. Core: `calendar/interaction/` additions; 3. Adapters; 4. Tests; 5. Size budgets; 6. Examples; 7. Docs and agent files; 8. Delivery (PR breakdown); 9. Definition of done; 10. Changes to earlier plans; 11. Out of scope; 12. Open questions | 14 KB |
| [`09-drag-resize-02.md`](09-drag-resize-02.md) | 13. Implementation guide (added after stages 1–2 shipped) | 11 KB |

Read order for implementation: the decisions part first, then the part for the PR you are on, then the implementation guide (it overrides earlier text where it says so).
