# Plan: stage 1 — Foundation (`@zealakit/chrono-core/foundation`)

Status: **implemented** (stage 1, version 0.1.0, internal).

Order: **3 of N**. Runs after `01-create-src.md` (skeleton green). Implements stage 1 of
`02-implement-business-flow.md` §9. The next plan is `04-calendar-views.md` (stage 2).

Goal: build the shared, framework-free base that every domain (Calendar, Date, Time,
DateTime) uses: value types, locale, constraints, ranges, grids, keyboard navigation, the
controller store and the domain boundary check. All of it lives in the private core package.

**Scope rule:**
- Core only. **No adapter gets a new export** in this stage, because no domain has a
  component yet (02 §2.7: entries are added only when they have content). Adapter READMEs keep
  "No public API yet."
- No `date/`, `time/`, `datetime/`, `calendar/` folders yet. Only `foundation/`.
- Every function listed here is needed by stage 2 or stage 4 (02 §2.1 limit: no date-fns
  replacement). If a function has no named consumer in 02's flows, it is cut.

Signatures below are **shapes**, written as TypeScript types so they are exact. They are the
spec, not the code.

---

## Parts

This plan is split so an agent can load only what it needs. **Read this index first, then only the part(s) for the task at hand.** `§N` references anywhere in the plans keep their numbering; the table maps them to files.

| Part | Contents | Size |
| --- | --- | --- |
| [`03-foundation-01.md`](03-foundation-01.md) | 1. Decisions taken in this plan; 2. File layout | 7 KB |
| [`03-foundation-02.md`](03-foundation-02.md) | 3. Module specs; 4. Domain boundary check (`scripts/check-domains.mjs`) | 13 KB |
| [`03-foundation-03.md`](03-foundation-03.md) | 5. Tests; 6. Packaging and size; 7. Docs and agent files; 8. Delivery (PR breakdown); 9. Definition of done; 10. Out of scope (later stages); 11. Open questions | 7 KB |

This plan is implemented; read only the part you need as reference.
