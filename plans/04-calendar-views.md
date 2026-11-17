# Plan: stage 2 — Calendar views and navigation (`/calendar`)

Status: **implemented** (stage 2, version 0.2.0; not yet published to npm).

Order: **4 of N**. Runs after `03-foundation.md` (foundation green, `0.1.0`). Implements
stage 2 of `02-implement-business-flow.md` §9: flows **F1** (navigate a calendar) and **F2**
(Mini Calendar). The next plan is `05-event-layout.md` (stage 3).

Goal: the first user-facing release. Every adapter gets the `/calendar` subpath and its root
re-export, with headless month, week, work week, day, agenda, multi-month and custom views,
navigation, headers and a Mini Calendar. **No events yet.** Views show the empty structure
that stage 3 fills with events.

**Scope rule:**
- Calendar domain only. No `date/`, `time/`, `datetime/` folders or entries.
- Views render days, weeks, time slots and headers. Event layout, the now-indicator, slot
  selection and the live clock belong to stage 3 (F3–F6).
- Signatures below are **shapes** (TypeScript types as spec, not code). Names are final
  unless a PR review finds a collision.

---

## Parts

This plan is split so an agent can load only what it needs. **Read this index first, then only the part(s) for the task at hand.** `§N` references anywhere in the plans keep their numbering; the table maps them to files.

| Part | Contents | Size |
| --- | --- | --- |
| [`04-calendar-views-01.md`](04-calendar-views-01.md) | 1. Decisions taken in this plan | 6 KB |
| [`04-calendar-views-02.md`](04-calendar-views-02.md) | 2. Core: `calendar/` (`@zealakit/chrono-core/calendar`); 3. Adapters: the `/calendar` entry; 4. Entry points and the root/subpath test | 15 KB |
| [`04-calendar-views-03.md`](04-calendar-views-03.md) | 5. Tests; 6. Size gate (`scripts/check-size.mjs`); 7. Examples; 8. Docs and agent files; 9. Delivery (PR breakdown); 10. Definition of done; 11. Out of scope (later stages); 12. Open questions | 9 KB |

This plan is implemented; read only the part you need as reference.
