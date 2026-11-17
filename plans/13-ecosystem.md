# Plan: stage 6 — Ecosystem and 1.0

Status: **proposal — not implemented**.

Order: **13 of 13** in the current roadmap. Stage 6 of `02-implement-business-flow.md` §9
(BRD §14 "Ecosystem Expansion"). Runs after `12-recurrence.md` (`0.8.0`). Ends with
**`1.0.0`**.

Goal: turn a feature-complete 0.x library into a dependable 1.0: a written compatibility
policy, a repeatable **manual** release checklist (the same way Overlay and Disclosure are
released), real-browser checks run locally, community files, the remaining examples, and the
decisions that were deferred to this stage.

**Scope rule:**
- No new calendar or picker features. Only fixes found by the 1.0 review (§5) may change
  behavior.
- **No CI and no release automation** (decided): no `.github/workflows`, no Changesets, no
  bots. Every check runs on the maintainer's machine; the maintainer publishes by hand with
  `scripts/npm-publish.ts`, exactly like Overlay and Disclosure.
- Documentation stays in the root and package READMEs (EN/VI/CN) and `skills/` — still no
  `docs/` folder or docs app (01 §4.5).
- Integrations stay in example apps that install their own libraries (02 §2.8).

---

## Parts

This plan is split so an agent can load only what it needs. **Read this index first, then only the part(s) for the task at hand.** `§N` references anywhere in the plans keep their numbering; the table maps them to files.

| Part | Contents | Size |
| --- | --- | --- |
| [`13-ecosystem-01.md`](13-ecosystem-01.md) | 1. Decisions taken in this plan; 2. Compatibility policy (from 1.0); 3. 1.0 readiness criteria; 4. Examples polish; 5. API review (before `1.0.0-rc.0`); 6. Release checklist (every release from here on); 7. Docs; 8. Delivery (PR breakdown); 9. Definition of done; 10. Changes to earlier plans; 11. Out of scope; 12. Post-1.0 candidates (collected from earlier plans); 13. Open questions | 13 KB |
| [`13-ecosystem-02.md`](13-ecosystem-02.md) | 14. Implementation guide (added after stages 1–2 shipped) | 15 KB |

Read order for implementation: the decisions part first, then the part for the PR you are on, then the implementation guide (it overrides earlier text where it says so).
