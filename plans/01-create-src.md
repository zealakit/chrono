# Plan: create the Chrono monorepo skeleton (structure only, no business logic)

Status: **proposal — not implemented**.

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

## 1. Reference (verified in `../overlay` and `../disclosure`)

| Concern | Overlay | Disclosure | Chrono (target) |
| --- | --- | --- | --- |
| Workspace | pnpm, `packages/*` + `examples/*` | same | same |
| Shared kernel | `packages/core` (private, bundled into adapters by `scripts/bundle-core.mjs`) | none | **`packages/core`** (see §2) |
| Adapters | `vanilla`, `react`, `vue`, `svelte` | same | same; each later gets `/calendar`, `/date`, `/time`, `/datetime` subpath entries plus the root entry (plan 02 §2.7) |
| Build (core/react/vue/vanilla) | `rm -rf dist && tsc -p tsconfig.json` | same | same |
| Build (svelte) | `rm -rf dist && svelte-package -i src -o dist` | same | same |
| Test | `pnpm build && node --import ./tests/setup.ts --test tests/*.test.ts` (Svelte adds `--conditions=browser`), happy-dom, tests import `../dist/index.js` | same | same |
| Lint/format | Biome `2.6.8` | same | same |
| TS | `typescript ^6.0.3`, `tsconfig.base.json` NodeNext, strict | same | same |
| Examples | vanilla, react, vue, svelte, nextjs, astro | vanilla, react, vue, svelte, nextjs | vanilla, react, vue, svelte, nextjs (astro deferred, §9) |
| Docs | root + package `README{,_VI,_CN}.md`, `assets/` cover | same | same |
| User skills | `skills/overlay-*.md` | `skills/disclosure-*.md` | `skills/chrono-*.md` |
| Agent setup | `.agents/` (AGENTS.md, rules, skills); `AGENTS.md`, `CLAUDE.md` → `.agents/AGENTS.md`, `.cursor` → `.agents` symlinks | same | same |
| Tooling dirs | `scripts/`, `monitor/`, `.vscode/` | same + `scripts/tsconfig.json` | same as Overlay |
| Package scope / author | `@zealakit/overlay-*`, `nqhed - Huy Ed. Nguyen`, MIT | same pattern | `@zealakit/chrono-*` |

---

## 2. Decision (confirmed): include a private `core` package (Overlay model, not Disclosure model)

Date/time work is mostly framework-independent (calendar grid, date arithmetic, range and
selection state, keyboard grid navigation, locale formatting). That is exactly what Overlay's
`core` exists for. So Chrono follows Overlay:

- `@zealakit/chrono-core` — `"private": true`, never published.
- Adapters depend on it with `workspace:^`.
- `scripts/bundle-core.mjs` vendors `core/dist` into each adapter tarball at pack time.

In this plan `core` is an empty kernel: package, build, test harness, and the bundling script
wired end to end. Nothing in it is date logic.

If later plans decide core is not needed, deleting it is cheap (drop the package, the script,
and the `workspace:^` deps). Adding it later is more churn, so it goes in now.

---

## 3. Target tree

```text
chrono/
├── .agents/
│   ├── AGENTS.md                       # root agent guidance (source of truth)
│   ├── rules/chrono.mdc
│   └── skills/
│       ├── chrono/SKILL.md             # architecture skill (map, boundaries, workflow)
│       └── readme-system/SKILL.md      # copied from overlay, Profile block re-filled
├── .cursor -> .agents                  # symlink
├── AGENTS.md -> .agents/AGENTS.md      # symlink
├── CLAUDE.md -> .agents/AGENTS.md      # symlink
├── .gitignore                          # replaced with overlay's (plans/ stays tracked)
├── .vscode/settings.json
├── LICENSE                             # keep existing
├── README.md / README_VI.md / README_CN.md
├── assets/images/                      # cover placeholder (or copy overlay's layout)
├── biome.json
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── plans/
│   └── 01-create-src.md                # this file
├── scripts/
│   ├── bundle-core.mjs
│   ├── check-readmes.mjs
│   ├── npm-publish.ts
│   └── pack-packages.mjs
├── monitor/
│   ├── README.md
│   ├── index.html
│   ├── server.ts
│   ├── tsconfig.json
│   └── reports/.gitkeep
├── skills/
│   ├── chrono-vanilla.md
│   ├── chrono-react.md
│   ├── chrono-vue.md
│   └── chrono-svelte.md
├── packages/
│   ├── core/       { package.json, tsconfig.json, LICENSE, README{,_VI,_CN}.md,
│   │                 src/index.ts, tests/{setup.ts, support/dom.ts, tsconfig.json, package.test.ts} }
│   ├── vanilla/    { same shape }
│   ├── react/      { same shape }
│   ├── vue/        { same shape }
│   └── svelte/     { same shape; tests/setup.ts also registers the .svelte compile hook }
│   # src/{calendar,date,time,datetime}/ entry folders are added by the stage plans
│   # (02 §2.7, §9); this plan creates only src/index.ts
└── examples/
    ├── vanilla/    { package.json, index.html, tsconfig.json, src/{main.ts, styles.css} }
    ├── react/      { package.json, index.html, tsconfig.json, vite.config.ts, src/{main.tsx, app.tsx, styles.css} }
    ├── vue/        { package.json, index.html, tsconfig.json, vite.config.ts, src/{main.ts, app.vue, env.d.ts, styles.css} }
    ├── svelte/     { package.json, index.html, tsconfig.json, vite.config.ts, svelte.config.js, src/{main.ts, app.svelte, styles.css} }
    └── nextjs/     { package.json, next.config.ts, next-env.d.ts, tsconfig.json, app/{layout.tsx, page.tsx, globals.css} }
```

---

## 4. Steps

### 4.1 Root files

1. **`package.json`** — copy Overlay's root manifest, then:
   - `name: "@zealakit/chrono"`, `version: "0.0.0"`, `private: true`.
   - `description`: the BRD GitHub description ("Headless calendar and date/time components
     for building fully customizable scheduling and date selection experiences."). Update the
     existing root `README.md` sentence to match. The README intro uses the BRD patch §10
     positioning (independent, composable Calendar, Date, Time and DateTime capabilities).
   - `keywords`: `chrono, date, time, datetime, calendar, date-input, date-picker, time-input,
     time-picker, date-range, scheduler, event-calendar, headless, accessibility, a11y, ui,
     zealakit, react, vue, svelte, vanilla`.
   - `repository.url: git+https://github.com/zealakit/chrono.git`.
   - Same `packageManager` (`pnpm@12.18.0`), same `devDependencies`
     (`@biomejs/biome 2.6.8`, `@types/node ^24.19.0`, `typescript ^6.0.3`).
   - Same script set with `overlay` → `chrono`: `build`, `build:{core,vanilla,react,vue,svelte}`,
     `typecheck`, `test` (core → vanilla → react → vue → svelte), `lint`, `lint:fix`, `format`,
     `check`, `clean`, `dev:{vanilla,react,vue,svelte,nextjs}` (no `dev:astro`), `monitor`,
     `readme:check`, `pack:packages`, `release:check`, `npm:publish:{check,vanilla,react,vue,svelte,all}`.
2. **`pnpm-workspace.yaml`** — Overlay's file: `packages/*`, `examples/*`, `allowBuilds`
   (`esbuild`, `sharp` for Next), plus Disclosure's `minimumReleaseAgeExclude` block for
   Biome if pnpm's release-age gate still blocks `2.6.8`.
3. **`tsconfig.base.json`** — copy verbatim (identical in both references).
4. **`biome.json`** — copy Disclosure's; drop the `examples/vanilla/index.html` a11y override
   until the example has markup that needs it.
5. **`.gitignore`** — replace the GitHub Node template with Overlay's file (it already covers
   `dist`, `.svelte-kit`, `.next`, `node_modules/.vite`, `coverage`, `monitor/reports/*`,
   `*.tsbuildinfo`, `artifacts/`). Do **not** add Disclosure's `/plans` rule: plans are tracked in git.
6. **`.vscode/settings.json`** — `cSpell.words: ["vite", "zealakit"]`.
7. **`LICENSE`** — keep the existing one; confirm holder/year match the references.

### 4.2 Packages (all five)

For each of `core`, `vanilla`, `react`, `vue`, `svelte`, copy the Overlay package's
`package.json`, `tsconfig.json`, `tests/tsconfig.json` and rename:

| Field | Value |
| --- | --- |
| `name` | `@zealakit/chrono-<pkg>` |
| `version` | `0.0.0` |
| `description` | "Headless Calendar, Date, Time and DateTime components for `<Framework>`." (core: "Internal framework-independent calendar and date/time kernel. Private: bundled into each adapter package, never published to npm.") |
| `keywords` | chrono/date/time/calendar + framework words (no overlay/popover words) |
| `repository.directory` | `packages/<pkg>` |
| `homepage` / `bugs` | `github.com/zealakit/chrono` |
| `dependencies` | core: **none** (Overlay's `@floating-ui/dom` is not copied). Adapters: `@zealakit/chrono-core: workspace:^` only |
| `peerDependencies` | React `^18.0.0 \|\| ^19.0.0` (+ react-dom), Vue `^3.5.0`, Svelte `^5.0.0` |
| `devDependencies` | same versions as Overlay (`happy-dom`, `@testing-library/react`, `@types/react*`, `@vue/test-utils`, `@sveltejs/package`, `svelte-check`, framework runtimes) |
| `private` | `true` for core only; adapters keep `publishConfig.access: public` |
| scripts / exports / files / engines / sideEffects | unchanged from Overlay: root `.` export only, ESM only, `sideEffects: false`. The `./calendar`, `./date`, `./time`, `./datetime` subpaths (plan 02 §2.7) are added by the stage that ships each domain's first component, never as empty entries. Same for core's `./foundation` and domain subpaths |

Source and tests per package (the only "code" this plan writes):

- `src/index.ts` — an empty public surface: `export {};` plus a file header comment naming the
  package's role. **No** placeholder exports, no `VERSION` constant, no stub components (the
  hard rule "do not export speculative or unimplemented APIs" from both reference repos applies).
- `tests/setup.ts` — happy-dom `Window` → `globalThis`, copied from the matching Overlay package.
  Svelte's copy keeps the `registerHooks` loader that compiles `.svelte` files.
- `tests/support/dom.ts` — `resetDom()` only (drop Overlay's `setBox`/`setViewport` geometry
  helpers; they are positioning-specific).
- `tests/package.test.ts` — one smoke test so `node --test tests/*.test.ts` has a match:
  imports `../dist/index.js` and asserts the module loads with `node:assert/strict`.
  Adapters additionally assert their `dist` resolves `@zealakit/chrono-core` (proves the
  workspace link + build order).
- `LICENSE` — copy root LICENSE.
- `README.md`, `README_VI.md`, `README_CN.md` — §4.6.

### 4.3 Examples

Copy Overlay's `examples/{vanilla,react,vue,svelte,nextjs}` **config only**
(`package.json`, `tsconfig.json`, `vite.config.ts`, `svelte.config.js`, `next.config.ts`,
`next-env.d.ts`, `index.html`), rename to `@zealakit/chrono-<fw>-example`, dependency
`@zealakit/chrono-<fw>: workspace:*`. Keep Overlay's dev ports (Next `3010`). Set
`typescript` to `^6.0.3` in every example (Overlay's examples pin `^5.9.3`), matching the
packages. Keep the other example toolchain versions (`vite`, framework plugins, Next) from
Overlay. If a tool does not yet support TS 6 (e.g. `vue-tsc`, `svelte-check`, Next type
checking), record the blocker and pin only that example back to TS 5, instead of downgrading all
of them. Later stages show
both import styles (root and `/<domain>` subpath) in the examples.

Replace every source file with a minimal shell: an entry (`main.ts[x]`), an `app.*` that renders
a heading "Chrono — <Framework>" and imports the package (side-effect-free) so the workspace
link is exercised, and a near-empty `styles.css`. Drop every Overlay `*-examples.*` file.

### 4.4 Scripts and monitor

- `scripts/bundle-core.mjs` — copy; replace `@zealakit/overlay-core` with
  `@zealakit/chrono-core`. Leave the "add Core's runtime dependencies" logic; with zero core
  deps it is a no-op. It must also rewrite **subpath** specifiers
  (`@zealakit/chrono-core/<sub>`) to relative vendor paths, not only the bare package name
  (plan 02 §2.7). Core has no subpaths yet, so add the logic plus one test now: it is cheap and
  stage 1 needs it.
- `scripts/pack-packages.mjs` — copy; package list → the four `@zealakit/chrono-*` adapters.
- `scripts/check-readmes.mjs` — copy; `base` → `https://github.com/zealakit/chrono/blob/main`,
  root unit name → `Zealakit Chrono`, units → core + four adapters.
- `scripts/npm-publish.ts` — copy; replace package names/paths. Review every `overlay`
  occurrence (`grep -n overlay scripts/npm-publish.ts`) instead of a blind replace.
- `scripts/check-domains.mjs` (domain import-graph check, plan 02 §2.7, §8) is **not** part of
  this plan: there are no domain folders yet. `03-foundation.md` adds it.
- `monitor/` — copy `README.md`, `index.html`, `server.ts`, `tsconfig.json`,
  `reports/.gitkeep`; rename titles/package lists. Port stays `4177` unless both monitors
  run together (then pick `4178` and document it).

### 4.5 Agent setup

- `.agents/AGENTS.md` — Overlay's structure (intro, Always follow, Quick map, Commands, Hard
  boundaries, Definition of done) rewritten for Chrono. Keep the generic boundaries
  (dependency direction adapters → core, root entry → domain entries → core, core framework-free, SSR safety, TS conventions,
  kebab-case, no speculative exports, private core bundled at pack time, no `docs/` folder).
  Drop Overlay-specific ones (Floating UI, `createPositioner`, Popover/Tooltip/Dialog scope,
  arrow/animation). Add one line: "Scope: structure only — no components are implemented
  yet; see `plans/`." Add the BRD product boundary as a hard rule: "Chrono is UI
  infrastructure. It proposes changes (selected ranges, moved events) and never persists,
  fetches, syncs, or applies business rules — those belong to the consuming app." Also add
  the BRD patch policies as hard rules: four domains (Calendar, Date, Time, DateTime) with
  the one-way import graph from plan 02 §2.6; no required global Provider; no popup, portal
  or positioning code; no dependency on `@zealakit/overlay-*`, not even an optional peer.
- `.agents/rules/chrono.mdc` — same frontmatter (`alwaysApply: true`), generic rules only.
- `.agents/skills/chrono/SKILL.md` — map diagram (`vanilla/react/vue/svelte ──> chrono-core`),
  the entry-point rule (root re-exports the four domain subpaths, same implementations),
  the domain graph (`calendar → date/time → foundation`, `datetime → date + time`), where
  logic belongs, test/build workflow. No API content.
- `.agents/skills/readme-system/SKILL.md` — copy; re-fill the §0 Profile table
  (`Zealakit Chrono`, `zealakit/chrono`, units, `skills/chrono-*.md`, `.agents/skills/chrono`).
- Symlinks (relative, as in Overlay):
  `ln -s .agents/AGENTS.md AGENTS.md`, `ln -s .agents/AGENTS.md CLAUDE.md`, `ln -s .agents .cursor`.

### 4.6 Documentation

- Root `README.md` / `README_VI.md` / `README_CN.md` — follow the readme-system skill layout
  (cover, language switcher, intro, packages table, agent skills links, license). Package
  table lists the four adapters with an explicit "not yet released / in development" note,
  and a short line on the planned import styles (root or `/calendar`, `/date`, `/time`,
  `/datetime`).
  No install snippet that implies a working API.
- Package READMEs — readme-system "unit" layout with the API section stating "No public API
  yet." Core README states it is internal and never installed directly.
- `skills/chrono-{vanilla,react,vue,svelte}.md` — header + "Not yet available" stub so the
  root README links resolve and `readme:check` passes.
- `assets/images/` — cover image placeholder (`cover.svg`), referenced with `?raw=true`.

---

## 5. Out of scope (decided in `02-implement-business-flow.md`, built in `03-…` onward)

- Any date/time engine choice (native `Date` / `Temporal` / `@internationalized/date`) — 02 §2.1.
- Calendar views, event layout, Date/Time/DateTime Inputs and Panels, resources,
  locale/i18n APIs — 02 §5, §9.
- Core domain folders (`foundation/`, `calendar/`, `date/`, `time/`, `datetime/`) — 02 §3.
  In this plan `core/src/index.ts` stays empty.
- ~~Whether Chrono depends on `@zealakit/overlay-*` for picker popups~~ — decided in 02 §2.2: no dependency.
- `examples/astro` (add when there is something to show in three frameworks at once).
- CI workflows, release automation, npm publishing.

---

## 6. Verification

Run from `chrono/`:

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm test
pnpm lint
pnpm readme:check
pnpm pack:packages
```

Pass criteria:

- All commands exit 0.
- `pnpm build` emits `packages/*/dist/index.{js,d.ts}` (Svelte via `svelte-package`).
- `artifacts/` holds four `zealakit-chrono-*-0.0.0.tgz` files; each contains
  `dist/vendor/core/` and its `package.json` has no `@zealakit/chrono-core` dependency.
- `pnpm --filter './examples/*' run build` succeeds for all five examples.
- `pnpm dev:react` (spot check) serves the "Chrono — React" heading.
- `grep -rn -i 'overlay\|disclosure' --exclude-dir=node_modules --exclude-dir=plans .`
  returns only the deliberate "no dependency on `@zealakit/overlay-*`" rule in `.agents/` and
  example-integration notes (no leftover names copied from the references).
- `ls -l AGENTS.md CLAUDE.md .cursor` shows the three symlinks into `.agents/`.

---

## 7. Commit

One commit on a branch (e.g. `chore/scaffold-monorepo`), not on `main`:
`chore: scaffold pnpm monorepo (core + vanilla/react/vue/svelte, examples, tooling)`.
`pnpm-lock.yaml` and `plans/` (01, 02) are committed.

---

## 8. Open questions

1. ~~**Core package**~~ — **decided: keep core** (Overlay model, private `core` bundled into
   adapters, §2).
2. ~~**`/plans` in `.gitignore`**~~ — **decided: track plans in git.** They are committed
   with the scaffold commit (§7).
3. ~~**Starting version**~~ — **decided: `0.0.0`** for every package. `0.1.0` marks the end
   of stage 1 (plan 02 §9).
4. ~~**Toolchain versions in examples**~~ — **decided: align examples on `typescript ^6.0.3`**
   (same as packages, §4.3).

All open questions are decided.
