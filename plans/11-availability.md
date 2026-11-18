# Plan: stage 5c — Availability (`/calendar`, shared with `/date`, `/time`, `/datetime`)

Status: **implemented through PR 7** — foundation engine, calendar background layout and interaction checks, picker option wiring (date/time/datetime), `CalendarBackground` in React/Vue/Svelte, Vanilla attribute support, and the adapter option plumbing are done with tests. PR 8 is partly done: READMEs (EN/VI/CN), skills and agent files document availability, and the React and Vanilla examples shade closed hours; a background parity scenario and the version bump are still open.

Order: **11 of N**. Third stage-5 plan (02 §9). Runs after `10-resources.md` (`0.6.0`).
Implements flow **F9**: one availability model that drives Calendar backgrounds
(`data-unavailable`, blocked periods, closed hours, per resource) **and** what the Date, Time
and DateTime components let users select. Next: `12-recurrence.md`.

Goal: an app describes availability once — opening hours, lunch breaks, holidays,
maintenance windows, a doctor's weekly schedule — and every Chrono view and picker shows and
respects it the same way. The app still decides whether something is *really* available
(BRD §11: "the hotel application remains responsible for determining whether rooms are
actually available").

**Scope rule:**
- The model lives in `foundation/` so every domain can use it without crossing domain
  boundaries (02 §2.6). Calendar adds rendering; Date, Time and DateTime only add an option.
- No new subpath. Calendar gets background pieces and one part; pickers get an
  `availability` option.
- No styling (02 §2.8). Signatures below are **shapes**.

---

## Parts

This plan is split so an agent can load only what it needs. **Read this index first, then only the part(s) for the task at hand.** `§N` references anywhere in the plans keep their numbering; the table maps them to files.

| Part | Contents | Size |
| --- | --- | --- |
| [`11-availability-01.md`](11-availability-01.md) | 1. Decisions taken in this plan; 2. Core; 3. Tests; 4. Size budgets; 5. Examples; 6. Docs and agent files; 7. Delivery (PR breakdown); 8. Definition of done; 9. Changes to earlier plans; 10. Out of scope; 11. Open questions | 12 KB |
| [`11-availability-02.md`](11-availability-02.md) | 12. Implementation guide (added after stages 1–2 shipped) | 14 KB |

Read order for implementation: the decisions part first, then the part for the PR you are on, then the implementation guide (it overrides earlier text where it says so).
