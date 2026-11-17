# Plan: create the Chrono monorepo skeleton (structure only, no business logic) — part 1 of 2

> Part 1 of 2 of [`01-create-src.md`](01-create-src.md) (the index: scope, status and the part table). Section numbers (`§N`) are unchanged by the split. Shared rules: [`00-conventions-as-built.md`](00-conventions-as-built.md).

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
│   ├── check-deps.mjs
│   ├── check-independence.mjs
│   ├── check-standalone.mjs
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
