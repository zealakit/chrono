# Plan: stage 6 — Ecosystem, release automation and 1.0

Status: **proposal — not implemented**.

Order: **13 of 13** in the current roadmap. Stage 6 of `02-implement-business-flow.md` §9
(BRD §14 "Ecosystem Expansion"). Runs after `12-recurrence.md` (`0.8.0`). Ends with
**`1.0.0`**.

Goal: turn a feature-complete 0.x library into a dependable 1.0: automated and verifiable
releases, real-browser checks, a stable API with a written compatibility policy, community
files, the remaining examples, and the decisions that were deferred to this stage (publishing
core, new framework adapters).

**Scope rule:**
- No new calendar or picker features. Only fixes found by the 1.0 review (§5) may change
  behavior.
- Documentation stays in the root and package READMEs (EN/VI/CN) and `skills/` — still no
  `docs/` folder or docs app (01 §4.5).
- Integrations stay in example apps that install their own libraries (02 §2.8).

---

## 1. Decisions taken in this plan

| # | Topic | Decision | Why |
| --- | --- | --- | --- |
| EC1 | CI | GitHub Actions on every PR and on `main`: install → `build` → `typecheck` → `test` (core runs its four-zone matrix) → `lint` → `check:deps` → `check:domains` → `check:size` → `readme:check` → `pack:packages`, on Node = `engines` minimum, active LTS and current. Framework examples build in a **required** job; integration example apps (Overlay, Radix, Base UI …) build in a **separate, non-required** job | Every rule the plans defined is enforced on each change. A broken third-party release must not block Chrono (02 §2.8) |
| EC2 | Release tooling | **Changesets** with all four adapters in one `fixed` group (lockstep, 04 C15); core is `private` and never published. Each PR adds a changeset; the release PR collects changelogs per package. Prereleases use Changesets pre mode with the `next` tag (06 §8) (§12.3) | Changelogs per package without hand-written release notes; lockstep is a built-in feature |
| EC3 | Publishing | A `release` workflow publishes from CI with **npm trusted publishing (OIDC) and provenance**, gated by a GitHub **environment that requires the maintainer's approval**. Agents never trigger or approve it. The manual `pnpm npm:publish:*` scripts stay as a fallback | Verifiable builds, no long-lived npm tokens, and the maintainer still decides every release (04 C15) |
| EC4 | Core distribution | **Keep `@zealakit/chrono-core` private for 1.0** (§12.1). Framework-free and server users import utilities from `@zealakit/chrono-vanilla/<domain>` (or any adapter; utilities are server-safe, 04 C13). A curated public package can be **added** after 1.0 if UI library maintainers ask (BRD §5.5) — adding a package is not a breaking change | Avoids freezing internal APIs; the need is already met |
| EC5 | Real-browser checks | Playwright end-to-end tests **in the examples only** (not in packages, which keep `node:test` + happy-dom, 01): keyboard flows, pointer drag/resize, touch long press, focus with popups, and `axe-core` accessibility scans on every example page. Browsers: Chromium, Firefox, WebKit (§12.2) | Covers what happy-dom cannot (layout, real pointer events, `elementFromPoint`, scrolling) without a second test framework in the packages |
| EC6 | Browser support | Last two versions of Chrome, Edge, Firefox, Safari; iOS Safari and Android Chrome current. Written in every README; checked by EC5 | A public promise needs a test behind it |
| EC7 | Astro example | `examples/astro` with React, Vue and Svelte islands on one page (Calendar, DatePanel, TimePanel), server-rendered with `now` and `locale`, hydrated per island | Proves SSR + hydration across three frameworks at once (01 deferred it) |
| EC8 | Live demos | The framework examples are built to static sites and deployed to GitHub Pages by a workflow that the maintainer enables. Integration example apps are included | BRD §13 "demonstrate real-world use cases". Publishing a site is the maintainer's call |
| EC9 | Community files | `CONTRIBUTING.md` (setup, plans workflow, changesets, the hard rules), `CODE_OF_CONDUCT.md`, `SECURITY.md` (private reporting), issue templates (bug with reproduction link, feature request against the BRD scope), PR template (checks, changeset, README parity) | BRD §13 "community contributions". These are repo files, not a docs folder |
| EC10 | Supply chain | Dependabot (or Renovate) for dev dependencies and example dependencies, grouped weekly; `pnpm audit --prod` in CI (prod has zero runtime deps outside core, 02 §2.8); 2FA required for npm owners | Few dependencies, kept current |
| EC11 | Metrics (BRD §15) | `scripts/report-metrics.mjs` reads **public** npm download counts and GitHub repository stats (no tokens, no user data) and prints a monthly summary; the monitor dashboard shows the last report | Measures adoption without tracking users |
| EC12 | New adapters | No new framework adapter before 1.0. Candidates after 1.0, in order of expected demand: a **Web Components** (custom elements) adapter, Solid, Angular. Criteria to start one: open requests with real use cases, and a maintainer for it | BRD §14 framework coverage, without delaying 1.0 |

---

## 2. Compatibility policy (from 1.0)

Written into every README and `CONTRIBUTING.md`:

- **Public API** = everything exported from an adapter entry (root and subpaths), all
  component props and events, every `data-*` attribute and ARIA role in the attribute
  contracts, every `--chrono-*` custom property, keyboard behavior in the documented tables,
  and the value types.
- **Breaking changes** only in major versions. Renaming or removing a `data-*` attribute or
  custom property **is** breaking (apps style against them).
- **Deprecation:** deprecated in a minor with a development warning and a README note, removed
  in the next major at the earliest.
- **Not public:** core internals, `src/shared/`, file layout inside `dist`, the exact output of
  development warnings.
- **Supported environments** as EC6; Node as `engines`; React 18/19, Vue 3.5+, Svelte 5.
- Bug fixes that change behavior to match the documented contract are patches.

---

## 3. 1.0 readiness criteria

`1.0.0` is cut only when **all** of these hold:

1. Stages 1–5 shipped (plans 03–12), all flows F1–F19 covered by tests.
2. A feedback period of **at least 8 weeks** after `0.8.0`, with every issue labelled `api` or
   `a11y` resolved or explicitly deferred past 1.0.
3. The API review (§5) is complete and its fixes are released as a `1.0.0-rc.N` on `next`
   for at least 2 weeks without new `api` issues.
4. Deprecated shapes removed (e.g. the date-only `createAvailability` spec, 11 §2.1).
5. EC5 e2e and `axe` scans pass in all three browser engines; a manual screen-reader pass with
   VoiceOver (macOS, iOS), NVDA and JAWS on the examples is recorded.
6. All size budgets met; no `any` in public types; every public export has TSDoc and appears
   in the README of its package.
7. The compatibility policy (§2) and browser support (EC6) are published in the READMEs.

---

## 4. Examples polish

- Every integration example app (06 §4) covers all four domains: Calendar "+N more" in a
  popover, DateInput + DatePanel, TimeInput + TimePanel, DateTimeInput + DateTimePanel.
- A **styling showcase** in the React example: the same components with three different
  stylesheets (minimal, Outlook-like, dense data UI) — shows design freedom (BRD §8.2).
- A "kitchen sink" page per framework used by EC5 tests and `axe` scans.
- Each example README explains which libraries it installs and why none of them is a Chrono
  dependency (02 §2.8).

---

## 5. API review (before `1.0.0-rc.0`)

A checklist issue, worked through in PRs:

| Area | Check |
| --- | --- |
| Naming | Same concept, same name across domains and adapters (`onValueChange`, `onValueCommit`, `min`/`max`, `readOnly` …); part names follow `<Component><Part>` (04 C1) |
| Options | Controlled/uncontrolled trio complete everywhere (02 §2.3); defaults documented; no option that only one adapter supports |
| Types | Generic event/resource types flow into render callbacks; overloads for plain vs zoned values (08 X1) are correct; no `any` |
| Attributes | Vocabulary list in 02 §4 matches the code; parity fixtures cover every attribute |
| Messages | Every default message key documented; override shape consistent |
| Errors | Development warnings have stable prefixes (`[chrono]`) and link to the README section |
| Size | Budgets reviewed; dead code removed |
| Exports | Root = union of subpaths (entries tests); no accidental internal exports |

---

## 6. Docs

- Root README: product positioning (BRD patch §10), the four domains, install, both import
  styles, compatibility policy, browser support, links to live demos (EC8) and examples.
- Package READMEs (EN/VI/CN): API sections reviewed for completeness (§3.6), a 0.x → 1.0
  migration section listing every rename and removal from the API review.
- `skills/chrono-*.md`: refreshed for 1.0.
- `.agents/AGENTS.md` + skill: compatibility policy as hard rules ("never rename a `data-*`
  attribute in a minor"), release flow with changesets, "agents never publish or approve
  releases".

---

## 7. Delivery (PR breakdown)

| PR | Content |
| --- | --- |
| 1 | CI workflow (EC1), Dependabot/Renovate and audit (EC10) |
| 2 | Changesets setup, release workflow with trusted publishing and the approval environment (EC2, EC3); `npm-publish.ts` kept as fallback |
| 3 | Community files (EC9) |
| 4 | `examples/astro` (EC7) |
| 5 | Playwright e2e + `axe` in examples, browser matrix job (EC5, EC6) |
| 6 | Examples polish (§4), GitHub Pages workflow (EC8, disabled until the maintainer enables it) |
| 7 | Metrics script + monitor view (EC11) |
| 8+ | API review fixes (§5), one PR per area; removal of deprecated shapes |
| Docs | Compatibility policy, migration guide, README review (§6) |
| RC | `1.0.0-rc.0` on `next` through the release workflow (maintainer approves) |
| Release | `1.0.0` on `latest` after §3 holds (maintainer approves) |

PRs 3, 4 and 7 are independent of each other and of PRs 1–2.

---

## 8. Definition of done

- §3 criteria all met and recorded in the 1.0 release notes.
- `1.0.0` published with provenance; `npm view @zealakit/chrono-react` shows the provenance
  attestation; `@zealakit/chrono-core` is still not on npm.
- CI green on `main`, e2e green in all three engines.

---

## 9. Changes to earlier plans

- **04 C15:** manual publishing is replaced by the approval-gated release workflow (EC3); the
  manual scripts remain as a fallback.
- **02 §9:** stage 6 content as in this plan; `1.0.0` follows the §3 criteria instead of only
  "real-world feedback after stage 4".
- **Earlier advice on core** ("decide before 1.0"): settled as EC4 — keep private; a curated
  public package can be added later without breaking anyone.

---

## 10. Out of scope

- New features of any domain (go to post-1.0 plans).
- New framework adapters (EC12, post-1.0).
- A separate documentation website or docs folder (01 §4.5).
- Commercial support offerings (BRD §13: not an initial requirement).

---

## 11. Post-1.0 candidates (collected from earlier plans)

Drag to the edge to change range (09 §12.3), stacked overlap mode (05 E8), month/year-only
picker values (06 §11), `BYSETPOS` and other RRULE parts (12 §12.2), recurring availability
rules (11 §10), recurrence editor and rule descriptions (12 §10), convenience Input + Panel
fields (02 §2.2), a curated public core (EC4), new adapters (EC12), non-Gregorian calendars
(02 §2.1).

---

## 12. Open questions

1. **Core at 1.0** — keep private and point framework-free users to `chrono-vanilla`
   (recommended, EC4), or publish a curated `@zealakit/chrono-core` with 1.0?
2. **Real-browser e2e** — Playwright + `axe` in the examples (recommended, EC5), or keep
   happy-dom tests only and rely on manual browser checks?
3. **Release tooling** — Changesets with a `fixed` group (recommended, EC2), or keep the
   custom `npm-publish.ts` flow and write changelogs by hand?
