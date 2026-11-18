# Plan: stage 6 — Ecosystem and 1.0 — part 1 of 2

> Part 1 of 2 of [`13-ecosystem.md`](13-ecosystem.md) (the index: scope, status and the part table). Section numbers (`§N`) are unchanged by the split. Shared rules: [`00-conventions-as-built.md`](00-conventions-as-built.md).

## 1. Decisions taken in this plan

| # | Topic | Decision | Why |
| --- | --- | --- | --- |
| EC1 | Checks | **No CI** (decided). The release gate is local: `pnpm release:check` (= `check` + `pack:packages`, as in Overlay/Disclosure) plus `pnpm --filter "./examples/*" build` and `pnpm e2e` (EC5). `pnpm check` already includes `build`, `typecheck`, `test` (core four-zone matrix), `lint`, `check:deps`, `check:domains`, `check:size`, `readme:check`. Integration example apps build in a separate local command (`pnpm examples:integrations`) whose failure is reported but does not block a release (02 §2.8) | Same workflow as the other Zealakit repos; one command tells the maintainer whether a release is safe |
| EC2 | Release tooling | Keep the custom flow from plan 01: `scripts/npm-publish.ts` (`check`, `vanilla`, `react`, `vue`, `svelte`, `all`) with the prerelease rules from 06 §8. Add `scripts/set-version.mjs <version>` that sets the same version in every package (lockstep, 04 C15; core included but stays private) and refuses a version lower than the current one. No Changesets (decided, §13.3) | Matches Overlay/Disclosure. Lockstep needs one small helper, not a tool |
| EC3 | Publishing | The **maintainer** publishes from their own machine: `pnpm release:check` → `pnpm npm:publish:check` → `pnpm npm:publish:all` (npm asks for the 2FA one-time password), then a git tag `v<version>` and a GitHub release with hand-written notes. Agents never publish, tag or create the GitHub release (04 C15). npm provenance is not used (it needs a CI provider) | Manual, like the other repos, with the human decision kept explicit |
| EC4 | Core distribution | **Keep `@zealakit/chrono-core` private** for 1.0 (decided, §13.1). Framework-free and server users import utilities from `@zealakit/chrono-vanilla/<domain>` (or any adapter; utilities are server-safe, 04 C13). A curated public package could be **added** after 1.0 if UI library maintainers ask (BRD §5.5); adding a package is not a breaking change | Avoids freezing internal APIs; the need is already met |
| EC5 | Real-browser checks | Playwright end-to-end tests **in the examples only**, run locally with `pnpm e2e` (not in packages, which keep `node:test` + happy-dom, 01): keyboard flows, pointer drag/resize, touch long press, focus with popups, and `axe-core` scans on every example page, in Chromium, Firefox and WebKit (decided, §13.2). Playwright and `axe-core` are dev dependencies of an `examples/e2e` workspace package, never of a Chrono package (`check:deps` stays green) | Covers what happy-dom cannot (layout, real pointer events, `elementFromPoint`, scrolling) |
| EC6 | Browser support | Last two versions of Chrome, Edge, Firefox, Safari; iOS Safari and Android Chrome current. Written in every README; checked by EC5 before each release | A public promise needs a test behind it |
| EC7 | Astro example | `examples/astro` with React, Vue and Svelte islands on one page (Calendar, DatePanel, TimePanel), server-rendered with `now` and `locale`, hydrated per island | Proves SSR + hydration across three frameworks at once (01 deferred it) |
| EC8 | Live demos | `pnpm demos:build` builds every example to a static folder (`artifacts/demos/`). Hosting is the maintainer's manual choice (e.g. uploading to GitHub Pages); no deploy automation | BRD §13 "demonstrate real-world use cases" without CI |
| EC9 | Community files | `CONTRIBUTING.md` (setup, plans workflow, the hard rules, the release checklist), `CODE_OF_CONDUCT.md`, `SECURITY.md` (private reporting), `.github/ISSUE_TEMPLATE/` (bug with reproduction link, feature request against the BRD scope) and a PR template. Templates are static files, not automation | BRD §13 "community contributions" |
| EC10 | Dependencies | The existing `monitor/` dashboard (01 §4.4, like Overlay) shows outdated dependencies; the maintainer updates them by hand. `pnpm audit --prod` is part of `release:check`. No Dependabot/Renovate | Matches the other repos; Chrono has no runtime dependencies besides private core (02 §2.8) |
| EC11 | Metrics (BRD §15) | `scripts/report-metrics.mjs` (run by hand) reads **public** npm download counts and GitHub repository stats (no tokens, no user data) and prints a summary; the monitor shows the last report | Measures adoption without tracking users |
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
3. The API review (§5) is complete and its fixes are released as `1.0.0-rc.N` on `next` for at
   least 2 weeks without new `api` issues.
4. Deprecated shapes removed (e.g. the date-only `createAvailability` spec, 11 §2.1).
5. `pnpm e2e` (EC5) and `axe` scans pass in all three browser engines on the maintainer's
   machine; a manual screen-reader pass with VoiceOver (macOS, iOS), NVDA and JAWS on the
   examples is recorded.
6. `pnpm release:check` passes (incl. the independence checks I1–I8); all size budgets met; no `any` in public types; every public
   export has TSDoc and appears in the README of its package.
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
- **Segment recipes** (BRD §4.2), one page each in the React example and linked from the
  READMEs: reporting filter (presets + `MonthRangePanel`), e-commerce delivery date (lead time,
  cutoff, business days, 11 V13–V14), hotel stay (dynamic minimum nights, 06 A23), clinic
  appointment (DateTime slots + availability), **project timeline** (tasks passed as timeline
  rows, plan 10), team calendars (`calendarId` overlays, 05 E23).
- **Form-library recipes**: React Hook Form, VeeValidate, Svelte forms and a plain HTML form
  posting to a server action (hidden inputs, 06 A15). Each library is installed by its example.

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

## 6. Release checklist (every release from here on)

Written in `CONTRIBUTING.md` and the agent skill. Steps 1–5 can be prepared by an agent;
steps 6–8 are the maintainer's.

1. `node scripts/set-version.mjs <version>` (lockstep).
2. Update the changelog section of each package README (EN/VI/CN) by hand.
3. `pnpm release:check` (includes `pnpm audit --prod`, `check:independence` and
   `check:standalone`, 02 §2.8 I1–I8).
4. `pnpm --filter "./examples/*" build` and `pnpm e2e`; `pnpm examples:integrations`
   (report only).
5. `pnpm npm:publish:check` and inspect `artifacts/*.tgz` (no `.css`, vendored core, no
   `@zealakit/chrono-core` dependency).
6. **Maintainer:** `pnpm npm:publish:all` (prereleases go to `next` automatically, 06 §8).
7. **Maintainer:** `git tag v<version>` and push the tag; GitHub release with notes.
8. **Maintainer:** smoke-test a fresh install from npm (04 §10).

---

## 7. Docs

- Root README: product positioning (BRD patch §10), the four domains, install, both import
  styles, compatibility policy, browser support, links to examples (and demos if hosted).
- Package READMEs (EN/VI/CN): API sections reviewed for completeness (§3.6), a 0.x → 1.0
  migration section listing every rename and removal from the API review.
- `skills/chrono-*.md`: refreshed for 1.0.
- `.agents/AGENTS.md` + skill: compatibility policy as hard rules ("never rename a `data-*`
  attribute in a minor"), the release checklist (§6), "no CI or release automation", "agents
  never publish, tag or create releases".

---

## 8. Delivery (PR breakdown)

| PR | Content |
| --- | --- |
| 1 | `set-version.mjs`, `pnpm audit --prod` in `release:check`, `examples:integrations` and `demos:build` scripts (EC1, EC2, EC8, EC10) |
| 2 | Community files (EC9), release checklist in `CONTRIBUTING.md` (§6) |
| 3 | `examples/astro` (EC7) |
| 4 | Playwright e2e + `axe` in examples, `pnpm e2e` (EC5, EC6) |
| 5 | Examples polish (§4) |
| 6 | Metrics script + monitor view (EC11) |
| 7+ | API review fixes (§5), one PR per area; removal of deprecated shapes |
| Docs | Compatibility policy, migration guide, README review (§7) |
| RC | `1.0.0-rc.0` on `next` via the §6 checklist (maintainer publishes) |
| Release | `1.0.0` on `latest` after §3 holds (maintainer publishes) |

PRs 2, 3 and 6 are independent of each other and of PR 1.

---

## 9. Definition of done

- §3 criteria all met and recorded in the 1.0 GitHub release notes.
- `1.0.0` published by the maintainer with the §6 checklist; `@zealakit/chrono-core` is still
  not on npm.
- The repository contains no `.github/workflows/` and no release-automation config.

---

## 10. Changes to earlier plans

- **04 C15 / 02 §9:** "until stage 6 automates it" is replaced by "manual for every release,
  including 1.0 and after" (EC3). Done in this change.
- **04 §11:** release automation is no longer a later item; it is not planned.
- **01 §5:** "CI workflows, release automation" stays out of scope permanently.
- **02 §9:** `1.0.0` follows the §3 criteria.
- **Earlier advice on core** ("decide before 1.0"): settled as EC4 — keep private.

---

## 11. Out of scope

- CI, release automation, deploy automation, dependency bots (decided).
- New features of any domain (post-1.0 plans) and new framework adapters (EC12).
- A separate documentation website or docs folder (01 §4.5).
- Commercial support offerings (BRD §13: not an initial requirement).

---

## 12. Post-1.0 candidates (collected from earlier plans)

Drag to the edge to change range (09 §12.3), stacked overlap mode (05 E8), side-by-side
calendars and per-calendar controls beyond `calendarId` (05 E23), a second time-zone axis in
day/week views (BRD §7.5), `BYSETPOS` and other RRULE parts (12 §12.2), recurring availability
rules (11 §10), recurrence editor and rule descriptions (12 §10), ~~convenience Input + Panel
fields (02 §2.2)~~ (moved to `14-enhance-overlay.md`: Overlay-based `chrono-picker-*` packages,
`1.1.0`), a curated public core (EC4), new adapters (EC12), non-Gregorian calendars
(02 §2.1).

---

## 13. Open questions

1. ~~**Core at 1.0**~~ — **decided: keep private** (EC4).
2. ~~**Real-browser e2e**~~ — **decided: local Playwright + `axe`** in the examples, run with
   `pnpm e2e` before every release (EC5, §6 step 4). Playwright is a dev dependency of the
   examples workspace only, never of a Chrono package.
3. ~~**Release tooling**~~ — **decided: manual**, `scripts/npm-publish.ts` like Overlay and
   Disclosure, no Changesets, no CI (EC1–EC3).

All open questions are decided.

---
