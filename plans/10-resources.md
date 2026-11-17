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

## Parts

This plan is split so an agent can load only what it needs. **Read this index first, then only the part(s) for the task at hand.** `§N` references anywhere in the plans keep their numbering; the table maps them to files.

| Part | Contents | Size |
| --- | --- | --- |
| [`10-resources-01.md`](10-resources-01.md) | 1. Decisions taken in this plan; 2. Core; 3. Adapters; 4. Tests; 5. Size budgets; 6. Examples; 7. Docs and agent files; 8. Delivery (PR breakdown); 9. Definition of done; 10. Changes to earlier plans; 11. Out of scope; 12. Open questions | 15 KB |
| [`10-resources-02.md`](10-resources-02.md) | 13. Implementation guide (added after stages 1–2 shipped) | 12 KB |

Read order for implementation: the decisions part first, then the part for the PR you are on, then the implementation guide (it overrides earlier text where it says so).
