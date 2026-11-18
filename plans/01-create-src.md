# Plan: create the Chrono monorepo skeleton (structure only, no business logic)

Status: **implemented** (scaffold on branch `coding-v1`). **Amended by
[`14-enhance-overlay.md`](14-enhance-overlay.md):** the "no Overlay dependency" rule (§4.4,
§4.5, §5) now covers core and the four adapters only; Overlay-based pickers live in separate
`@zealakit/chrono-picker-*` packages.

Goal: turn `chrono/` (today: `README.md`, `LICENSE`, a GitHub Node `.gitignore`, one commit
`Initial commit`, remote `zealakit/chrono`) into a pnpm monorepo with **the same layout, tooling,
package-manifest shape, test harness, scripts, docs system and agent setup as
`../overlay` and `../disclosure`**. Every package builds, typechecks, tests and lints green, but
ships **no Calendar / Date / Time / DateTime logic** yet.

**Scope rule:** structure only. No date math, no components, no hooks, no `data-*` contract, no
locale handling, no third-party date library. Anything that would be a product decision
(Calendar views, DateInput/DatePanel, TimeInput/TimePanel, DateTime APIs, which date engine to use) belongs to later
plans (`02-…` onward).

Order: **1 of N**. Nothing runs before it. `02-implement-business-flow.md` (BRD → architecture
→ delivery stages) follows and owns every product decision listed in §5.

---

## Parts

This plan is split so an agent can load only what it needs. **Read this index first, then only the part(s) for the task at hand.** `§N` references anywhere in the plans keep their numbering; the table maps them to files.

| Part | Contents | Size |
| --- | --- | --- |
| [`01-create-src-01.md`](01-create-src-01.md) | 1. Reference (verified in `../overlay` and `../disclosure`); 2. Decision (confirmed): include a private `core` package (Overlay model, not Disclosure model); 3. Target tree | 5 KB |
| [`01-create-src-02.md`](01-create-src-02.md) | 4. Steps; 5. Out of scope (decided in `02-implement-business-flow.md`, built in `03-…` onward); 6. Verification; 7. Commit; 8. Open questions | 15 KB |

This plan is implemented; read only the part you need as reference.
