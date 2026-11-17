# Plan: stage 4b — Time domain (`/time`)

Status: **implemented in part** (core, the four Time components in all four adapters, both layouts, slots, parser, validity, forms and parity; not yet: T21 display formats, the integration and example apps, and the prerelease).

Order: **7 of N**. Second stage-4 plan in `02-implement-business-flow.md` §9. It can run in
parallel with `06-date.md`, because Time never imports Date (02 §2.6). `08-datetime.md` needs
both. Implements flows **F15** (TimeInput, TimePanel, time slots), **F16** (TimeRangeInput,
TimeRangePanel) and the Time part of **F19** (compose with an external popup).

Goal: add the `/time` subpath to every adapter with `TimeInput`, `TimePanel`,
`TimeRangeInput` and `TimeRangePanel`. They work with **no date at all**: opening hours,
working hours, daily schedules, appointment slots (BRD patch §4).

**Scope rule:**
- Time domain only. `/time` must not reach Date or Calendar code (checked by
  `check-domains.mjs`).
- No date, no time zone in values. A time is a wall-clock time of an unspecified day.
- No popup, trigger, positioning or dismissal; no CSS (02 §2.2, §2.8).
- Same conventions as plan 06 wherever the problem is the same (change vs commit, forms,
  clear, read-only/disabled, Escape, autoFocus off, vanilla declarative init). This plan only
  restates them where Time differs.
- Signatures below are **shapes** (TypeScript as spec, not code).

---

## Parts

This plan is split so an agent can load only what it needs. **Read this index first, then only the part(s) for the task at hand.** `§N` references anywhere in the plans keep their numbering; the table maps them to files.

| Part | Contents | Size |
| --- | --- | --- |
| [`07-time-01.md`](07-time-01.md) | 1. Decisions taken in this plan; 2. Core: `time/` (`@zealakit/chrono-core/time`) | 13 KB |
| [`07-time-02.md`](07-time-02.md) | 3. Adapters: the `/time` entry; 4. Examples and integration recipes; 5. Tests; 6. Size budgets; 7. Docs and agent files; 8. Delivery (PR breakdown); 9. Definition of done; 10. Changes to earlier plans; 11. Out of scope; 12. Open questions | 8 KB |
| [`07-time-03.md`](07-time-03.md) | 13. Implementation guide (added after stages 1–2 shipped) | 11 KB |

Read order for implementation: the decisions part first, then the part for the PR you are on, then the implementation guide (it overrides earlier text where it says so).
