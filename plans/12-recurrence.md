# Plan: stage 5d — Recurring events (`/calendar`)

Status: **implemented** in `0.8.0` (PRs 1–8; see `12-recurrence-01.md` §8–§9 and `12-recurrence-02.md` §13).

Order: **12 of N**. Last stage-5 plan (02 §9). Runs after `11-availability.md` (`0.7.0`).
Implements flow **F10**: expand a recurrence rule into the occurrences of the visible range,
and give edits of a recurring occurrence the information the app needs to apply them to
"this", "following" or "all" occurrences. Next: `13-ecosystem.md` (stage 6).

Goal: apps can pass a series (one event + a rule) instead of pre-expanded occurrences, and
editing an occurrence works with the drag/resize flow from plan 09. Chrono expands and
proposes; the app stores series, overrides and exceptions (BRD §11).

**Scope rule:**
- Calendar domain only, same `/calendar` entry, as an **opt-in pack** (same pattern as
  `resourceViews`, 10 R4).
- Pre-expanded occurrences (05 E21) keep working unchanged.
- A subset of RFC 5545 RRULE (02 F10). No recurrence-editor UI, no natural-language
  descriptions (§10).
- Signatures below are **shapes**.

---

## Parts

This plan is split so an agent can load only what it needs. **Read this index first, then only the part(s) for the task at hand.** `§N` references anywhere in the plans keep their numbering; the table maps them to files.

| Part | Contents | Size |
| --- | --- | --- |
| [`12-recurrence-01.md`](12-recurrence-01.md) | 1. Decisions taken in this plan; 2. Core; 3. Adapters; 4. Tests; 5. Size budgets; 6. Examples; 7. Docs and agent files; 8. Delivery (PR breakdown); 9. Definition of done; 10. Out of scope; 11. Changes to earlier plans; 12. Open questions | 11 KB |
| [`12-recurrence-02.md`](12-recurrence-02.md) | 13. Implementation guide (added after stages 1–2 shipped) | 12 KB |

Read order for implementation: the decisions part first, then the part for the PR you are on, then the implementation guide (it overrides earlier text where it says so).
