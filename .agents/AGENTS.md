# Agent instructions (Zealakit Chrono)

Zealakit Chrono is a **pnpm monorepo** for a headless calendar and date/time interaction
library. It provides independent, composable **Calendar, Date, Time and DateTime** capabilities
for Vanilla TypeScript, React, Vue, and Svelte. There is one shared, private runtime kernel
(`@zealakit/chrono-core`); adapters are thin and idiomatic to their framework.

**Scope: Calendar views and events (stage 3, `0.3.0`) the Date domain (`/date`, plan 06) and the Time domain (`/time`, plan 07), both unreleased, are shipped on top of the foundation; DateTime components, month/year panels (06 A25), month-name formats (06 A22 and 07 T21) are not implemented yet; see `plans/`.** Plans are
numbered (`01-…`, `02-…`) and tracked in git. `plans/02-implement-business-flow.md` owns every
product decision; the stage plans that follow it own the implementation.

This file is the root agent guidance. `.agents/` is the single source of truth for
repository-specific AI instructions: `AGENTS.md`, `CLAUDE.md`, and `.cursor/` are symlinks
into it — never duplicate instruction content outside `.agents/`.

## Always follow

- **Skill:** [.agents/skills/chrono/SKILL.md](skills/chrono/SKILL.md)
- **README skill:** [.agents/skills/readme-system/SKILL.md](skills/readme-system/SKILL.md)
  (load it before touching any README)
- **Rules:** [.agents/rules/](rules/)
- **Plans:** [plans/](../plans/) — read the plan for the stage you are working on first.

Load the chrono skill before code, test, docs, or release work.

## Quick map

| Area | Path | Package |
| --- | --- | --- |
| Internal framework-agnostic kernel | `packages/core/` | `@zealakit/chrono-core` (private) |
| Vanilla DOM adapter | `packages/vanilla/` | `@zealakit/chrono-vanilla` |
| React adapter | `packages/react/` | `@zealakit/chrono-react` |
| Vue adapter | `packages/vue/` | `@zealakit/chrono-vue` |
| Svelte adapter | `packages/svelte/` | `@zealakit/chrono-svelte` |
| Integration examples | `examples/{vanilla,react,vue,svelte,nextjs}/` | private |
| Product documentation | root `README*.md` + `packages/*/README*.md` (EN, VI, CN) | — |
| User-facing integration skills | `skills/chrono-*.md` | — |
| Plans (decisions + stages) | `plans/` | — |
| Dependency monitor | `monitor/` | local dashboard |
| Release + policy scripts | `scripts/` (`bundle-core`, `pack-packages`, `check-deps`, `check-independence`, `check-domains`, `check-size`, `check-standalone`, `check-readmes`, `npm-publish`) | — |
| Agent skills | `.agents/skills/{chrono,readme-system}/SKILL.md` | — |
| README cover image | `assets/images/chrono-cover.jpg` | — |

## Commands

```bash
pnpm install
pnpm build              # builds packages in topological order (core first)
pnpm typecheck          # requires a successful build (adapters resolve core from dist)
pnpm test               # core + vanilla + react + vue + svelte + script tests (node:test + happy-dom)
pnpm lint               # Biome
pnpm check              # build + typecheck + test + lint + check:deps + check:independence + check:domains + check:size
pnpm check:deps         # per-package dependency allowlist, no path links outside the repo
pnpm check:independence # no committed path to a sibling repository
pnpm check:domains      # domain import graph on src and dist: folder rules, reachability, cycles
pnpm check:size         # gzip size of every entry against size-budgets.json (fails when over)
pnpm check:standalone   # pack, install each tarball into an empty project, import + Vite build
pnpm clean              # remove package/example build output and local tarballs
pnpm pack:packages      # pack the four adapter tarballs, Core bundled in, into artifacts/
pnpm release:check      # check + check:standalone (no publish)
pnpm npm:publish:check  # build + test all five, pack/bundle/inspect the four adapters (no publish)
pnpm readme:check       # README structure: EN/VI/CN parity, absolute links, H1 = package name

pnpm dev:vanilla
pnpm dev:react
pnpm dev:vue
pnpm dev:svelte
pnpm dev:nextjs

pnpm monitor            # dependency dashboard at http://127.0.0.1:4177
```

## Hard boundaries

- **Product boundary:** Chrono is UI infrastructure. It proposes changes (selected ranges,
  moved events) and never persists, fetches, syncs, or applies business rules — those belong
  to the consuming app.
- **Dependency direction:** adapters → core. Core never imports React, Vue, Svelte, or any
  adapter. No adapter imports another adapter. No circular dependencies.
- **Entry points:** root entry → domain entries → core. The root entry only re-exports the
  domain entries (`/calendar`, `/date`, `/time`, `/datetime`); a domain entry never imports
  the root. Entries are added by the stage that ships their first component, never empty.
- **Domains:** four domains — Calendar, Date, Time, DateTime — over a shared `foundation`.
  `scripts/check-domains.mjs` enforces this on `src` and `dist` of core and every adapter. A
  folder may import only the folders on its row; adapter domain folders reach core through the
  matching `@zealakit/chrono-core/<domain>` subpath and may also use the adapter's `shared/`:

  | From | May import |
  | --- | --- |
  | `foundation/` | `foundation/` |
  | `date/` | `foundation/`, `date/` |
  | `time/` | `foundation/`, `time/` (never `date/`) |
  | `datetime/` | `foundation/`, `date/`, `time/`, `datetime/` |
  | `calendar/` | `foundation/`, `date/`, `time/`, `calendar/` |
  | any | never the package's own root `index`; nothing imports `calendar/` |

- **Foundation conventions (plan 03):** months are 1-based and Monday = 1 (`DayOfWeek` 1-7).
  Date values are plain frozen objects with free functions, no classes. Date ranges are inclusive
  `[start, end]`; date-time intervals are half-open `[start, end)`. Nothing in `foundation/values`
  uses the host's local time zone: `Date` is touched only in `convert.ts` and `clock.ts`, through
  UTC getters or an explicit zone. Never read the clock or the default locale implicitly: take an
  optional `now` and `locale` (SSR passes both explicitly). No function exists that plan 03 §3
  does not list.
- **Core stays framework-free:** no framework runtime, no styling, zero runtime dependencies.
- **No required global Provider.** Each component takes locale, time zone and similar settings
  from its own props. Context is allowed only inside one compound component.
- **No popup code:** no popup, portal, positioning, layering, or dismissal behavior, not even
  as optional helpers. Composition with a popup is the app's job.
- **Independence (plan 02 §2.8, I1–I8):** no dependency on `@zealakit/overlay-*`, not even an
  optional peer. No external UI library (Overlay, Radix, Base UI, …) in any dependency field of
  any package, direct or indirect. No `link:`/`file:`/`portal:` specifier and no path to a
  sibling repository in any committed file. Integrations live only in example apps that install
  the library themselves from npm. Code reused from Overlay is copied, never imported.
  `pnpm check:deps` and `pnpm check:independence` enforce this.
- **Styling:** no CSS, theme, CSS-in-JS, or visual inline styles in any package. Chrono writes
  only state (`data-*`, ARIA) and layout numbers as `--chrono-*` custom properties.
- **No network, no globals at runtime:** only built-in `Intl`; no CSS injection, no `window`
  writes. Page-global state goes through a versioned `Symbol.for` key on `globalThis`.
- **Tests:** new code needs focused tests in the owning package (`packages/*/tests/`); run
  `pnpm test`. Do not add a second test framework or DOM library.
- **SSR safety:** never touch `window`, `document`, `navigator`, or `matchMedia` during module
  initialization or during React/Vue/Svelte render. Guard DOM work behind lifecycle effects.
- **TypeScript:** `type` aliases, not `interface` (except ambient declaration merging);
  `import type` for type-only imports; ESM with explicit `.js` relative specifiers.
- **Naming:** files and folders are `kebab-case`; exported components are `PascalCase`.
- **Package surface:** do not export speculative or unimplemented APIs. No placeholder
  components, no fake implementations, no empty entry points.
- **Public packaging:** only the four adapters are published to npm. Core is `"private": true`
  and never published: `scripts/bundle-core.mjs` copies the built Core into each adapter
  tarball (`dist/vendor/core/`), rewrites `@zealakit/chrono-core` and
  `@zealakit/chrono-core/<sub>` imports to relative paths, and drops the Core dependency.
  Never document Core as an install or configuration entry point.
- **Size budgets:** `size-budgets.json` holds a gzip budget (KB) per entry (`core/foundation`,
  `core/calendar`, and `root` plus `calendar` of each adapter). `pnpm check:size` fails the build
  when an entry is over. Ceilings: core foundation 10, core calendar 6, adapter calendar entries
  20. If a measurement is over its ceiling, shrink the code. Raising a budget needs a line in the
  PR description saying why.
- **React directives:** `"use client"` goes only on modules that define components or hooks.
  Entry files (`src/index.ts`, `src/<domain>/index.ts`) and modules that only re-export core
  utilities have none, so utilities stay callable in Server Components and server actions.
- **Adapter parity:** the four adapters render the same attribute contract. The shared scenarios
  in `tests/fixtures/calendar-parity.json` (regenerated by the React tests with
  `UPDATE_PARITY=1`) must produce identical DOM snapshots in every adapter.
- **Documentation:** there is intentionally no `docs/` folder and no separate docs app.
  Product documentation lives only in the root README and package READMEs, in EN, VI, and CN,
  following the [readme-system skill](skills/readme-system/SKILL.md).
- **Releases:** manual only. No CI workflows, no automated publishing.

## Definition of done

`pnpm check` and `pnpm readme:check` pass. Examples still build
(`pnpm --filter './examples/*' run build`). Update this file and the
[skill](skills/chrono/SKILL.md) when boundaries, commands, or workflows change.
