# Plan: stage 4c — DateTime domain (`/datetime`)

Status: **proposal — not implemented**.

Order: **8 of N**. Last stage-4 plan in `02-implement-business-flow.md` §9. Runs after
`06-date.md` and `07-time.md` (both on `next`). Implements flows **F17** (DateTimeInput,
DateTimePanel), **F18** (DateTimeRangeInput, DateTimeRangePanel) and the DateTime part of
**F19**. Ends stage 4 with the final **`0.4.0`** release on `latest`.

Goal: add the `/datetime` subpath to every adapter. DateTime **composes** Date and Time
(BRD patch §5): it reuses their core controllers and their adapter parts, and adds only what
needs both a date and a time — cross-part constraints, time zones, DST handling and combined
values.

**Scope rule:**
- `/datetime` may reach Date, Time and foundation code, never Calendar (02 §2.6).
- **No duplicated logic**: date selection, time selection, segment typing and parsing come
  from `date/`, `time/` and `foundation/input/` (02 §2.7, 07 T16).
- No popup, positioning, dismissal or CSS (02 §2.2, §2.8). No time-zone **picker** UI (§11).
- Conventions from plans 06/07 (change vs commit, forms, clear, read-only/disabled, Escape,
  `autoFocus` off, one tab stop per panel, two-field range inputs, vanilla declarative init)
  apply unchanged unless restated.
- Signatures below are **shapes** (TypeScript as spec, not code).

---

## Parts

This plan is split so an agent can load only what it needs. **Read this index first, then only the part(s) for the task at hand.** `§N` references anywhere in the plans keep their numbering; the table maps them to files.

| Part | Contents | Size |
| --- | --- | --- |
| [`08-datetime-01.md`](08-datetime-01.md) | 1. Decisions taken in this plan; 2. Core: `datetime/` (`@zealakit/chrono-core/datetime`); 3. Adapters: the `/datetime` entry; 4. Examples and recipes; 5. Tests | 15 KB |
| [`08-datetime-02.md`](08-datetime-02.md) | 6. Size budgets; 7. Docs and agent files; 8. Delivery (PR breakdown); 9. Definition of done; 10. Changes to earlier plans; 11. Out of scope; 12. Open questions | 3 KB |
| [`08-datetime-03.md`](08-datetime-03.md) | 13. Implementation guide (added after stages 1–2 shipped) | 12 KB |

Read order for implementation: the decisions part first, then the part for the PR you are on, then the implementation guide (it overrides earlier text where it says so).
