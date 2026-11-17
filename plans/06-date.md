# Plan: stage 4a — Date domain (`/date`)

Status: **implemented in part** (core, the five Date components in all four adapters, presets, forms and parity; not yet: A22 month-name formats, A25 month and year components, the shared grid refactor, the integration example apps and the prerelease).

Order: **6 of N**. Runs after `05-event-layout.md` (`0.3.0` published). First of the three
stage-4 plans in `02-implement-business-flow.md` §9: **06 Date**, `07-time.md` Time (can run
in parallel, neither imports the other), then `08-datetime.md` DateTime (needs both).
Implements flows **F11** (DateInput), **F12** (DatePanel), **F13** (DateRangeInput /
DateRangePanel), **F14** (MultiDatePanel) and the Date part of **F19** (compose with an
external popup).

Goal: add the `/date` subpath to every adapter with five independent, composable,
unstyled components: `DateInput`, `DatePanel`, `DateRangeInput`, `DateRangePanel`,
`MultiDatePanel`. They work alone, together through a shared value, and inside any popup the
app chooses.

**Scope rule:**
- Date domain only. `/date` must not reach Calendar or Time code (02 §2.6, checked by
  `check-domains.mjs`).
- No popup, trigger, open state, positioning, portal or dismissal (02 §2.2, §2.8).
- No CSS, no visual inline styles (02 §2.8).
- Signatures below are **shapes** (TypeScript as spec, not code).

---

## Parts

This plan is split so an agent can load only what it needs. **Read this index first, then only the part(s) for the task at hand.** `§N` references anywhere in the plans keep their numbering; the table maps them to files.

| Part | Contents | Size |
| --- | --- | --- |
| [`06-date-01.md`](06-date-01.md) | 1. Decisions taken in this plan | 9 KB |
| [`06-date-02.md`](06-date-02.md) | 2. Core: `date/` (`@zealakit/chrono-core/date`); 3. Adapters: the `/date` entry; 4. Integration recipes (F19, Date part) | 13 KB |
| [`06-date-03.md`](06-date-03.md) | 5. Tests; 6. Size budgets; 7. Docs and agent files; 8. Delivery (PR breakdown); 9. Definition of done; 10. Changes to earlier plans; 11. Out of scope; 12. Open questions | 7 KB |
| [`06-date-04.md`](06-date-04.md) | 13. Implementation guide (added after stages 1–2 shipped) | 12 KB |

Read order for implementation: the decisions part first, then the part for the PR you are on, then the implementation guide (it overrides earlier text where it says so).
