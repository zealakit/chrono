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
rules (11 §10), recurrence editor and rule descriptions (12 §10), convenience Input + Panel
fields (02 §2.2), a curated public core (EC4), new adapters (EC12), non-Gregorian calendars
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

## 14. Implementation guide (added after stages 1–2 shipped)

Read [`00-conventions-as-built.md`](00-conventions-as-built.md) first. Decisions EC1–EC12 stay unless a bullet below says
otherwise. Everything in this plan that touches the network, the npm registry, GitHub or a browser download is the
**maintainer's** step; an agent prepares files and scripts, runs only the offline parts, and says what it did not run.

### 14.1 Reconciliations with the as-built repository

| # | Problem | Resolution |
| --- | --- | --- |
| R1 | **`release:check` is not "check + pack".** As built: `release:check` = `pnpm check && pnpm check:standalone` (`check:standalone` packs the tarballs itself); `check` already runs build, typecheck, test, lint, `check:deps`, `check:independence`, `check:domains`, `check:size`. | Final definition: `release:check` = `pnpm check && pnpm readme:check && pnpm audit:prod && pnpm check:standalone`. (`readme:check` is **not** part of `check` today — add it here.) `pack:packages` stays a separate command (also run inside `check:standalone`). Update `CONTRIBUTING.md`, the agent skill and §6 to this exact list. |
| R2 | **`pnpm --filter './examples/*'` builds every example**, including the integration apps planned in 06 §4 (`examples/react-overlay`, …). EC1 wants integration builds to be non-blocking. | Naming convention + path filters (documented in `package.json` scripts): *core examples* are `examples/{vanilla,react,vue,svelte,nextjs,astro}` and `examples/e2e`; *integration apps* are every other `examples/*-*` folder. Scripts: `examples:build` (core examples only, **blocking**, used by `release:check` step 4), `examples:integrations` (integration apps, report-only: run with `--no-bail`, print a summary table, exit 0 unless the script itself fails), `demos:build` (all of them to `artifacts/demos/<name>/`). Verify the filters with `pnpm --filter "<glob>" ls --depth -1` in a test script (`scripts/tests/examples-filters.test.mjs`) so a new folder cannot silently fall out of both groups. |
| R3 | **`pnpm audit --prod` scope and network.** It audits every workspace project (examples pull React, Next, Vite, Astro). Packages have no runtime dependencies. | Add `audit:prod`: `pnpm audit --prod` restricted to the packages (verify whether this pnpm version supports `--filter`; if not, run it in each `packages/*` directory). Treat registry/network errors as **failures with a clear message** (a silent skip would defeat the gate); allow `--allow-network-failure` only for the maintainer's offline dry runs. Examples are audited separately and reported only. |
| R4 | **Version helper edge cases.** `set-version.mjs <version>` must handle prereleases (`0.4.0-next.1`, `1.0.0-rc.0`) and the packages' ordering rules; no `semver` dependency is allowed in Chrono packages, but a root script may use a tiny comparator. | Implement a ~30-line semver comparator in `scripts/lib/semver.mjs` (major.minor.patch + prerelease identifiers: numeric < alphanumeric, shorter < longer, any prerelease < the release) with tests including `0.4.0-next.1 < 0.4.0-next.2 < 0.4.0`, `1.0.0-rc.0 < 1.0.0`. The helper updates `packages/{core,vanilla,react,vue,svelte}/package.json` only (not root, not examples), equal version = no-op message, lower = error, `--force` bypass for the maintainer. `npm-publish.ts` already requires one shared version; add a test that `set-version` output passes `validateRelease`. |
| R5 | **`publishTagFor` (06 R8) is the single tag rule.** | The release checklist, `npm-publish.ts` summary and tests all go through it: prerelease → `next`, plain → `latest`; a `1.0.0-rc.N` never reaches `latest`. Add the dist-tag report (`npm view <pkg> dist-tags`) to the maintainer's post-publish step. |
| R6 | **Browser downloads.** Playwright needs browser binaries (hundreds of MB). | `examples/e2e` has a `pnpm e2e:install` script the **maintainer** runs once; `pnpm e2e` checks for the browsers first and prints "run `pnpm e2e:install`" instead of failing obscurely. Agents must not download browsers without the user's explicit approval (state the size/source when asking). Packages stay `node:test` + happy-dom. |
| R7 | **Astro dependencies need the release-age gate.** `pnpm-workspace.yaml` has `minimumReleaseAgeExclude` entries for biome only. | Before adding `examples/astro`, run `npm view <pkg> version` for `astro`, `@astrojs/react`, `@astrojs/vue`, `@astrojs/svelte` and pin versions that exist; add `minimumReleaseAgeExclude` entries only when pnpm blocks a fresh release, with the exact `pkg@version`. |
| R8 | **Community files and `check-independence`.** The path scan flags `../overlay`-style paths in any committed file outside `plans/`. | Do not write sibling-repo paths in `CONTRIBUTING.md`/templates; refer to "the Overlay project" by name only. Contact for security reports = **GitHub private vulnerability reporting** (no email address is invented; the maintainer enables it in the repository settings and the file says so). Adopt the Contributor Covenant 2.1 text unmodified with attribution; the enforcement paragraph points to the maintainers via private GitHub report. |

### 14.2 Scripts to specify precisely (no code here, behavior only)

| Script | Behavior | Tests |
| --- | --- | --- |
| `scripts/set-version.mjs <version> [--force]` | R4 | `scripts/tests/set-version.test.mjs` on a temp copy of the five manifests |
| `scripts/audit-api.mjs` (new, supports §5) | **Offline** audits over the built `dist`: (1) *vocabulary*: collect every `data-*` attribute name and `--chrono-*` property name found in core/adapter `src` and check that each appears in the documented vocabulary (a data file `plans`-independent: `scripts/data/vocabulary.json`, generated once from 02 §4 + the stage plans and then maintained) and in at least one README table; (2) *exports*: every public export of each adapter entry appears in that package's README (EN); (3) *types*: the `.d.ts` files contain no `: any`/`<any>`; (4) *TSDoc*: every public export has a leading doc comment (use the TypeScript compiler API already available as a root devDependency); (5) *messages*: every key of `defaultMessages` is documented | table-driven tests with a tiny fixture package; the script's failures list `file → problem` like `check-domains` |
| `scripts/report-metrics.mjs` | Network, run by hand: public npm download counts (`api.npmjs.org/downloads/point/last-week/<pkg>` for the four adapters) and public GitHub repository stats (unauthenticated REST: stars, forks, open issues) → prints a table and writes `monitor/reports/metrics-<date>.json` (git-ignored by the existing `monitor/reports/*` rule); handles rate-limit (HTTP 403/429) with a clear message; sends no tokens and no user data | unit tests with a stubbed `fetch` (injected) for formatting and error paths |
| `scripts/examples-filters` (in `package.json`) | R2 | `examples-filters.test.mjs` |
| `pnpm e2e` | Builds the core examples, starts each with `vite preview` / `next start` / `astro preview` on fixed ports through Playwright's `webServer`, runs the suites in Chromium, Firefox and WebKit, then the axe scans | see §14.3 |

### 14.3 End-to-end and accessibility suites (`examples/e2e`)

- **Workspace package** `@zealakit/chrono-e2e` (private) with dev dependencies `@playwright/test` and `@axe-core/playwright`; no Chrono package
  depends on it (`check:deps` unchanged). Config: projects `chromium`, `firefox`, `webkit`; `retries: 0` locally; traces on first failure.
- **Kitchen-sink pages** (one per core example, same route `/kitchen-sink`) render, with fixed `now`/`locale`: Calendar (month, week,
  agenda, timeline if the pack is enabled), Mini Calendar, DateInput/DatePanel (all modes), Time, DateTime, a popup recipe, drag/resize
  fixtures. Tests address elements through the documented attributes (`[data-chrono-key]`, roles), never CSS classes.
- **Flows to cover** (each in every framework example): roving keyboard navigation (arrows/Home/End/Page keys) and focus return after
  prev/next; Enter-into-cell and Tab inside a cell (plan 05); pointer drag and resize with real `mouse` events and the 4 px threshold
  (plan 09); touch long press (`hasTouch` project option); popup recipe: focus into the panel, Escape closes the popup (not the panel),
  focus returns; form submit with hidden inputs; RTL (`locale: "ar-EG"`) key swap.
- **axe**: scan every page and each state that changes semantics (open popup, interaction mode, drag preview); fail on any
  violation except a small, commented allowlist per rule id (empty by default).
- **Determinism**: pages read `now`/`locale`/`timeZone` from the query string with safe defaults; the suites freeze them. Run the suites
  under two host time zones (`TZ=UTC`, `TZ=Asia/Ho_Chi_Minh`) via Playwright's `timezoneId` context option.

### 14.4 Astro example (EC7) — what to build

`examples/astro` (private, `@zealakit/chrono-astro-example`): one page with three islands — `<CalendarReact client:load>`, `<DatePanelVue
client:visible>`, `<TimePanelSvelte client:idle>` — each importing its own adapter (`@zealakit/chrono-react|vue|svelte`) from the registry-style
`workspace:*` link. The page frontmatter computes `now` and `locale` and passes them as props so the server HTML equals the first client render for all
three. Acceptance: `astro build` succeeds; the built HTML contains `data-chrono-calendar` etc. before any JS; e2e hydrates each island and keyboard
works; the three islands run on one page without clashing through the shared global state (`getGlobalState` keys are versioned and shared by design;
add a test that two islands' announcers resolve to **one** live region).

### 14.5 API review as a checklist with owners (§5)

Work it as a single checklist issue file (`plans/` is not for issues — put it in the PR description) with one PR per area. Concrete audits
(run `scripts/audit-api.mjs` first, then the manual items):

1. **Names**: grep the four adapters for the same concept spelled differently (`onChange` vs `onValueChange`, `disabled` vs `isDisabled`); fix
   toward the plan names (06–08).
2. **Pending renames from earlier guides** (apply together, list them in the migration section): adapter type re-exports `DateInput` → `DateInputValue`,
   `TimeInput` → `TimeInputValue`, `DateTimeInput` → `DateTimeInputValue` (06 R1); `CalendarTitle` type → `CalendarTitleValue`; the legacy
   `createAvailability({ mode, dates, ranges, weekdays })` shape removed (11 R1); behaviour changes since 0.2.0: time-grid column headers no longer
   focusable and Enter/Shift+Enter semantics (05 E11/E13); Svelte peer `^5.20.0`.
3. **Attributes**: every attribute in the parity fixtures exists in `vocabulary.json` and the other way round; no attribute is renamed after the
   RC without a major.
4. **Defaults**: each option default is stated once in the README table and asserted by a test (a "defaults" test per component reading the
   controller state with no options).
5. **Types**: add `tests/types/` compile-time checks for the generic flows (`TEvent`, `TResource`, `DateTimeValueOf<Z>`), including negative
   cases with `// @ts-expect-error`.
6. **Dev warnings**: single prefix `[chrono]`, one warning per cause per process, each pointing at a README anchor; test with a captured
   `console.warn`.
7. **Sizes**: re-run `node scripts/check-size.mjs --report`; record the final numbers in the 1.0 notes; remove dead exports found by the audit.

### 14.6 Docs deliverables (exact contents)

- **`CONTRIBUTING.md`**: prerequisites (Node, pnpm version from `packageManager`), the commands of 00 §5, "plans first" workflow (`plans/NN-*.md`,
  `00-conventions-as-built.md`), the hard rules (copied from `.agents/AGENTS.md`, one source of truth: link, do not duplicate), how to regenerate the
  parity fixture, how READMEs are checked (three languages, same structure), the release checklist (§6, with the maintainer-only steps marked), and the
  statement that agents never publish/tag/push releases.
- **Issue templates**: bug (version of each Chrono package, framework + version, browser/OS, minimal reproduction link **required**, expected vs
  actual, keyboard/assistive-tech involved yes/no), feature request (which BRD scope item, which domain, why not an app-level solution), a11y report
  (assistive tech + browser). PR template: checklist of 00 §5 plus "updated READMEs in all three languages".
- **Migration section** (each adapter README, EN/VI/CN, heading `## Migrating to 1.0`): table `Before | After | Notes` generated from the API-review
  decisions; keep the structure identical across languages (readme-check enforces headings and table shapes).
- **Compatibility policy** and **browser support**: one shared paragraph block (identical code blocks/tables across languages).
- **README `Note`** (canonical) is rewritten for 1.0 in all READMEs and the readme-system skill profile at the RC.

### 14.7 PR task list

| PR | Files | Done when |
| --- | --- | --- |
| 1 | `scripts/lib/semver.mjs`, `set-version.mjs`, `audit:prod`, `release:check` redefinition (R1), `examples:*`/`demos:build` filters (R2) + tests | `pnpm release:check` runs end to end on a clean tree (offline parts verified; network parts reported as not run) |
| 2 | `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, templates (R8) | `check:independence` green; links absolute |
| 3 | `examples/astro` (R7, §14.4) | `astro build` green; HTML contains server markup |
| 4 | `examples/e2e`, kitchen-sink pages, `e2e:install`/`e2e` scripts (R6, §14.3) | suites written; maintainer-run results reported (agents state they could not run them without browsers) |
| 5 | Examples polish: styling showcase (three stylesheets, **no Chrono CSS**), segment recipes, form-library recipes (libraries installed by the example) | all examples build; READMEs list their libraries |
| 6 | `scripts/report-metrics.mjs` (+ monitor read of `monitor/reports/metrics-*.json`) | stubbed-fetch tests green |
| 7+ | `scripts/audit-api.mjs` and the §14.5 fixes, one PR per area; removal of deprecated shapes | audit exits 0; migration table complete |
| Docs | Compatibility policy, migration sections, README review, rewritten `Note` | `readme:check` green in three languages |
| RC / Release | Maintainer-run checklist (§6) | n/a for agents |

### 14.8 Pitfalls checklist

- Do not create `.github/workflows/` or any bot config; templates only. The repository must contain no release automation at the end (§9).
- The 8-week feedback period and screen-reader passes are calendar/human steps; never mark §3 criteria 2, 3 or 5 as met from an agent session.
- `pnpm audit` and `npm view` need the network: report them as "not run" when offline instead of skipping silently.
- Keep every new root dev dependency (Playwright, axe) inside `examples/e2e`; the root `package.json` gains only scripts.
- Changing an attribute name or custom property after `1.0.0-rc.0` is a breaking change (§2); the audit script is the guard.
- After the release, update the `Status:` line of every plan to **implemented** with the version, and move deferred items to §12.
