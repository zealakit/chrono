# Plan: stage 3 — Event experiences (`/calendar`, events)

Status: **proposal — not implemented**.

Order: **5 of N**. Runs after `04-calendar-views.md` (`0.2.0` published). Implements stage 3
of `02-implement-business-flow.md` §9: flows **F3** (events in a month view), **F4** (events
in a week / work week / day time grid), **F5** (agenda) and **F6** (select and create events).
The next plans are `06-date.md` and `07-time.md` (stage 4).

Goal: fill the empty views from stage 2 with events. Chrono computes **where** every event
goes (lanes, columns, sizes, overflow, continuations) and handles event focus, selection and
range creation. The app renders each event and owns the data.

**Scope rule:**
- Calendar domain only. Same `/calendar` entry; no new subpath.
- Events are **read-only** in this stage: no dragging, moving or resizing (stage 5, F7).
- Chrono never stores, fetches or validates events against business rules (02 §2.4,
  §2.8). It receives an array and returns layout plus proposals.
- No styling (02 §2.8): positions are unitless CSS custom properties the app's CSS uses.
- Signatures below are **shapes** (TypeScript as spec, not code).

---

## Parts

This plan is split so an agent can load only what it needs. **Read this index first, then only the part(s) for the task at hand.** `§N` references anywhere in the plans keep their numbering; the table maps them to files.

| Part | Contents | Size |
| --- | --- | --- |
| [`05-event-layout-01.md`](05-event-layout-01.md) | 1. Decisions taken in this plan | 8 KB |
| [`05-event-layout-02.md`](05-event-layout-02.md) | 2. Core: `calendar/events/` and `calendar/interaction/`; 3. Adapters; 4. Entry points | 14 KB |
| [`05-event-layout-03.md`](05-event-layout-03.md) | 5. Tests; 6. Size budgets; 7. Examples; 8. Docs and agent files; 9. Delivery (PR breakdown); 10. Definition of done; 11. Out of scope (later stages); 12. Open questions | 8 KB |
| [`05-event-layout-04.md`](05-event-layout-04.md) | 13. Implementation guide (added after stages 1–2 shipped) | 14 KB |

Read order for implementation: the decisions part first, then the part for the PR you are on, then the implementation guide (it overrides earlier text where it says so).
