# Plan: stage 6 — Ecosystem and 1.0 — part 2 of 2

> Part 2 of 2 of [`13-ecosystem.md`](13-ecosystem.md) (the index: scope, status and the part table). Section numbers (`§N`) are unchanged by the split. Shared rules: [`00-conventions-as-built.md`](00-conventions-as-built.md).

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
