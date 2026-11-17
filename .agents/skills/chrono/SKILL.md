---
name: chrono-architecture
description: >-
  Use for any Zealakit Chrono code, test, documentation, or release work:
  deciding where logic belongs, keeping Core, domains and adapters separated,
  validating behavior, and packaging releases.
---

# Zealakit Chrono

Read `.agents/AGENTS.md` first, then the plan for the stage you are working on (`plans/`).
Keep this file compact. It holds no API content: the public API is defined by the stage plans
and documented in the package READMEs.

## Map

```text
vanilla ─┐
react ───┤
vue ─────┼──> @zealakit/chrono-core   (private, bundled into each adapter at pack time)
svelte ──┘

examples/* -> adapters
READMEs (EN/VI/CN) -> product documentation
```

- **Core** (`packages/core`) owns everything framework-independent: value types, date/time
  arithmetic, locale formatting, calendar grids, time axes, range and selection state, keyboard
  grid navigation, and the controller/store base.
- **Adapters** own framework lifecycle and idiomatic APIs (compound components, hooks,
  composables, actions, DOM controllers). They bind Core; they never re-implement it.

## Entry points

Every adapter (and Core) has the same shape once domains exist:

```text
src/
├── index.ts            # root entry: only `export * from "./<domain>/index.js"` lines
├── calendar/index.ts   # /calendar
├── date/index.ts       # /date
├── time/index.ts       # /time
├── datetime/index.ts   # /datetime
└── shared/             # internal helpers, never exported
```

- The root re-exports the four domain subpaths. `DatePanel` from `/date` and from the root
  is the same module file, so framework context identity holds when users mix import styles.
- A domain entry never imports the root entry.
- An entry and its `package.json` `exports` key are added by the stage that ships the
  domain's first component. Never add an empty entry.
- Core additionally has `./foundation`. Adapter domain folders import the matching Core
  subpath (`react/src/time/*` imports `@zealakit/chrono-core/time` and `/foundation`).

## Domain graph

```text
calendar ──> date, time, foundation
datetime ──> date + time
date ──────> foundation
time ──────> foundation        (never date)
nothing ───> calendar
```

`scripts/check-domains.mjs` (added by plan 03) enforces this on source and `dist`.

## Where logic belongs

| Logic | Place |
| --- | --- |
| Date math, parsing, formatting, grid and axis generation, selection state | Core, in its domain folder |
| Anything shared by two domains | Core `foundation/` |
| Framework state binding, refs, effects, rendering | The adapter's domain folder |
| Framework helpers shared by an adapter's domains | The adapter's `src/shared/` |
| Popups, persistence, fetching, business rules | The consuming app (never Chrono) |
| Third-party integrations (Overlay, Radix, Base UI) | Example apps only |

## Change workflow

1. Read the stage plan; identify the owning package, domain, and existing tests.
2. Put shared contracts and math in Core; framework lifecycle in the adapter.
3. Use TypeScript `type` aliases, `import type`, explicit `.js` relative imports.
4. Keep imports SSR-safe and side-effect-free (`sideEffects: false`).
5. Export only implemented public APIs and their types.
6. Add focused tests in the owning package; run `pnpm check`.
7. Update the READMEs (all three languages) when public behavior changes; load the
   [readme-system skill](../readme-system/SKILL.md) and run `pnpm readme:check`.

## Test and build workflow

```bash
pnpm build                                     # core first, then adapters
pnpm --filter @zealakit/chrono-<pkg> run typecheck
pnpm --filter @zealakit/chrono-<pkg> run test
pnpm check
```

- Tests run with `node --test` against the built `dist` (`tests/*.test.ts` import
  `../dist/index.js`), with a happy-dom window registered by `tests/setup.ts`. Svelte runs with
  `--conditions=browser` and compiles `.svelte` files through a `registerHooks` loader.
- Script tests live in `scripts/tests/*.test.mjs` (`pnpm test:scripts`).
- Do not add a second test framework or DOM library.
- Svelte builds with `svelte-package`, everything else with `tsc`.

## Release

- All five packages share one version. Only the four adapters are on npm. Core stays
  `workspace:^` in the repository; `scripts/bundle-core.mjs` (used by `pnpm pack:packages` and
  `scripts/npm-publish.ts`) vendors it into each tarball under `dist/vendor/core/`.
- `pnpm pack:packages` fails if a tarball contains a `.css` file.
- `pnpm check:standalone` installs each tarball into an empty project with only the framework
  peer and Vite, imports every entry point from Node, and builds with Vite.
- Peer ranges: React `^18.0.0 || ^19.0.0`, Vue `^3.5.0`, Svelte `^5.0.0`.
- Publishing is manual and needs explicit authorization: `pnpm npm:publish:check`, then
  `pnpm npm:publish:all` (or one adapter). No CI, no automated publishing.

## Documentation

- READMEs are the only product documentation; follow the
  [readme-system skill](../readme-system/SKILL.md).
- User-facing integration skills live in `skills/chrono-<framework>.md`; internal agent
  guidance stays in `.agents/`. Link the former from READMEs, never the latter.
- Document implemented behavior only. Integrations are documented as recipes, never as a
  Chrono feature.
