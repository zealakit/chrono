# Conventions as built (stages 1–2): read before coding any later plan

Status: **reference** — facts about the repository **as implemented** (plans 01, 03, 04; versions
`0.1.0` → `0.2.0`). Plans 05–13 were written before that code existed. Where a later plan and this
file disagree about *how the repo works today*, this file wins; where they disagree about *what to
build next*, the stage plan wins (and its "Implementation guide" section lists the reconciliations).

Every stage plan from 05 on ends with an **Implementation guide** section that points back here.

---

## 1. Repository map (what exists)

```text
packages/core/src/
├── foundation/          values, locale, constraints, ranges, grid, a11y, store   (plan 03)
└── calendar/            navigation/, views/, controllers/, internal/              (plan 04)
packages/{vanilla,react,vue,svelte}/src/
├── index.ts             export * from "./calendar/index.js"      (no code of its own)
├── calendar/            parts / hooks / controllers / utilities.ts / index.ts
└── shared/              react: merge-props, to-react-props, slot, part, modifiers
                         vue:   to-vue-props     svelte: props
scripts/                 bundle-core, pack-packages, check-{deps,independence,domains,size,standalone,readmes},
                         npm-publish.ts (+ d.mts typings), tests/*.test.mjs
tests/fixtures/calendar-parity.json     shared parity scenarios (read by all four adapters)
size-budgets.json                       gzip KB per entry (enforced by `pnpm check:size`)
```

Commands (all must stay green): `pnpm build`, `typecheck`, `test`, `lint`, `check:deps`,
`check:independence`, `check:domains`, `check:size`, `readme:check`, `pack:packages`,
`check:standalone`, `npm:publish:check`. `pnpm check` runs the first seven (plus build). Use
`pnpm lint:fix` before every commit (Biome rewrites formatting).

Branch `coding-v1`. Commit style `feat(core): …`, `feat(react): …`, `docs: …`, trailer
`Co-Authored-By: …`. The maintainer publishes to npm by hand; **agents never publish or push**.

## 2. Core design rules that are easy to break

1. **Foundation values are frozen plain objects** with free functions (no classes). Months 1-based,
   Monday = 1, date ranges inclusive, intervals half-open, no host time zone inside `values/`.
   `today()` and `Date.now()` are read only where plan 03 allows; everything else takes `now`.
2. **Controllers are framework-free** and follow one shape: `create…Controller(options)` →
   `getState()`, `subscribe()`, `setOptions(partial)`, action methods, `handleKeyDown(key, mods)`,
   attribute getters returning **plain records**, `destroy()`. State object identity is stable when
   nothing changed (consumers use `useSyncExternalStore` / store contracts, which loop forever
   otherwise).
3. **State equality is structural and JSON-based today** (`calendar/internal/equal.ts`:
   `JSON.stringify(a) === JSON.stringify(b)`). Consequences for every later stage:
   - State must be JSON-safe: no functions, `Map`/`Set`, `Date`, `NaN`/`Infinity`, cycles, `BigInt`.
   - Key order matters; build state objects in a fixed order.
   - **Anything that holds app objects (events, resources) must not be compared this way.** Plan 05
     replaces the comparison (see its guide): compare memoized layout arrays by reference.
4. `refresh(fix?)` recomputes and notifies only on change. `compute(fix)` pulls a focus that fell out
   of range back in **only after outside changes** (`setOptions`, creation), never mid-navigation:
   in controlled mode the app applies the new date asynchronously. Do not move that logic.
5. **Controlled/uncontrolled** goes through `createControllable` (`value !== undefined` = controlled).
   `setOptions` merges the full prop set every render; passing `undefined` switches back to
   uncontrolled. Handlers (`on*`) are read at call time from the latest options, so changing a
   handler never notifies.
6. **`lazyStart`** + `start()`: framework adapters create the controller during render with
   `lazyStart: true` and call `start()` from a mount effect, so app callbacks such as
   `onVisibleRangeChange` never run during SSR. Vanilla calls `start()` immediately. New "on mount"
   side effects (ticker, pointer listeners, announcer) belong behind `start()`/`mount()`, never in the
   constructor.
7. **Key presses start from the cell they happen on.** Every adapter's key handler first calls
   `controller.focusDate(day.date)` for the target cell, then `handleKeyDown`. There is deliberately
   **no `onFocus` syncing** (happy-dom re-fires focus on re-inserted nodes and the loop overwrote
   state). A "keyboard move" flag is set before `handleKeyDown` (Svelte/Vanilla subscribers run
   synchronously) and cleared on `keyup`; after the state change the adapter calls
   `focusDateCell(root, key)` only when the flag is set — a nav-button click never steals focus.
8. **Attribute records** (`getXAttributes()`): `true` → present with `""`, `false`/`undefined` →
   absent, strings/numbers as is. **No `class`, no `style`, no handlers** in a record (tests enforce
   it, §5). Adapters call `normalizeAttributes` and add their own handlers. Records are the
   contract: all four adapters must produce **identical** DOM attributes (parity fixture).
9. **Cell keys.** `data-chrono-key` carries an ISO date today (`2026-11-17`). The DOM helpers
   `focusDateCell(root, key)` / `syncRovingTabIndex(root, key)` accept any string, prefer the first
   match without `data-outside-month`, and the Vanilla `dateOf()` parses the key with `parseIsoDate`.
   Any new focusable cell kind needs a **distinct key format** (plans 05, 10) and a matching parser.
10. **Size budgets are tight.** `core/calendar` is at exactly its 6 KB ceiling (6,144 bytes gzip of
    the minified bundle, other core domains external). Any new code in `calendar/` requires the
    budget change that the stage plan lists **in the same PR** (`size-budgets.json`), measured with
    `node scripts/check-size.mjs --report`. Shrink first (shared helpers, `visibleDays`-style
    reuse); raise only inside the plan's ceiling.

## 3. Adapter rules that are easy to break

**New-option checklist** — every new `CalendarOptions` / `MiniCalendarOptions` key must be added in
**all** of these or it is silently dropped:

| Adapter | Place |
| --- | --- |
| core | `CalendarOptions` type, `setOptions` handling, `compute`/layout, tests |
| React | `src/calendar/options.ts` (`CALENDAR_KEYS` / `MINI_KEYS`, typed with `satisfies`) |
| Vue | `calendarProps` in `components.ts` (precise `PropType`), the `useCalendar(() => ({ …props }))` spread, `emits` for every callback |
| Svelte | destructuring in `calendar.svelte` (+ `$derived` options object, `types.ts`) |
| Vanilla | nothing to forward (options pass straight to the controller) — but add to the README table |

Further adapter facts:

- **React**: no component factories inside functions (Biome `noComponentHookFactories`): write each
  exported component explicitly, share one internal component. `"use client"` only on modules that
  define components/hooks, never on entries or utility modules (`directives.test.ts`). `className`
  /`style` come only from the consumer (`mergeProps`); `asChild` uses the copied `Slot`.
- **Vue**: render-function components, `inheritAttrs: false`, `mergeProps(attrs, chrono)`. Prop
  getters are wrapped in `tracked()` (reads `state.value`) so the part that calls them re-renders —
  a getter that skips this renders stale attributes. Emit names are camelCase (`visibleRangeChange`).
- **Svelte**: `useCalendar()` is a plain function returning a **store** (`state.subscribe`) plus
  getters. Derive attributes with `$derived.by(() => { void $store; return api.getX(); })` — a
  comma expression fails `svelte-check`. A wrapper component must pass `{children}` explicitly (an
  implicit children snippet is always truthy and suppresses the fallback content). Omit `slot` from
  HTML attribute types (`Omit<…, "slot">`) when a prop is called `slot`. Peer range is `^5.20.0`
  (`$props.id()`).
- **Vanilla**: `createCalendar(root, options)` delegates events on `root`; the app re-renders and
  calls `syncFocus()`; action buttons carry `data-chrono-action` (not part of the contract, the
  parity snapshot ignores it).
- **Name collisions**: `export *` from several modules fails on duplicate names. A component and a
  core *type* with the same name collide (`CalendarTitle` → the type is re-exported as
  `CalendarTitleValue`). Check new part/type names against `packages/*/src/calendar/utilities.ts`.
- **Type/component name clashes already on the road map.** Foundation exports the *types*
  `DateInput`, `TimeInput` (value-or-string inputs) and plan 05 adds `DateTimeInput`. Plans 06–08
  name **components** `DateInput`, `TimeInput`, `DateTimeInput`. A type and a component with the same
  name cannot both come through `export *`. Rule: adapters re-export the foundation types under
  **`DateInputValue`, `TimeInputValue`, `DateTimeInputValue`** (rename in each adapter's
  `calendar/utilities.ts` when the first of these components lands, and update READMEs); core keeps
  the original names. Check every new public name against the existing exports first.
- **Public surface tests** count exports (`package.test.ts`: 22 `Calendar*`/`MiniCalendar*` parts +
  8 helpers in React/Vue; 21 in Svelte, and an exact list in Vanilla). Update them with every new
  export.
- `bundle-core.mjs` rewrites `@zealakit/chrono-core/<subpath>` through core's `exports`: a new core
  subpath must be added to core `package.json` `exports` and to the domain lists in
  `scripts/check-domains.mjs` / `check-size.mjs` if it is a new domain.

## 4. Tests: how they really work

- Runner: `node --test` on built `dist/` (`pnpm build` first). Core runs **once per time zone**
  (`UTC`, `America/New_York`, `Asia/Ho_Chi_Minh`, `Australia/Lord_Howe`) through
  `packages/core/scripts/test-tz.mjs`; needs full ICU.
- Test files are `.ts` (no JSX): React tests use `createElement`. Put shared helpers in
  `tests/support/` (`dom.ts`, `reference.ts`, `scenarios.ts`, `snapshot.ts`, `text.ts`).
- **Never `assert.equal(domNodeA, domNodeB)`**: a failing comparison tries to diff happy-dom objects
  and hangs for minutes. Compare `getAttribute("data-chrono-key")` (or tag names).
- ICU inserts thin/no-break spaces (`U+2009`, `U+202F`, `U+00A0`) in dates and times. Normalize with
  `text.replace(/\s/g, " ")` (`tests/support/text.ts`) before comparing strings.
- **Parity**: `tests/fixtures/calendar-parity.json` lists scenarios (`options`, `steps`,
  `snapshot`). The reference compositions in each adapter's `tests/support/reference.*` must render
  the **same structure**. Regenerate snapshots only from React with
  `UPDATE_PARITY=1 node --import ./tests/setup.ts --test tests/parity.test.ts` (inside
  `packages/react`), then read the diff — a snapshot change is a contract change.
- Svelte tests compile fixture sources at run time into `tests/fixtures-*/` (git-ignored; delete
  stale ones left by killed runs) and need `--conditions=browser`; SSR parity renders in a child
  process with `tests/svelte-ssr-loader.ts`. Kill a hung run with the shell, not by waiting.
- Biome overrides for `**/tests/**`: `noExplicitAny` and `noChildrenProp` are off. Examples'
  `calendar-body.tsx` has a11y overrides for div-based ARIA rows.
- Entries: every adapter runs `entries.test.ts` (root names = subpath union, same bindings,
  reachability only inside `calendar/`+`shared/`+core subpaths) and `no-styles.test.ts` (no `[style]`
  or `[class]` in rendered markup, no `.css`, no `style:`/`style=` in `dist` JS). Stage 3 legitimately
  needs custom properties — its guide says exactly how to relax these tests (and nothing more).

## 5. Verification routine for every PR

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm test                 # core ×4 time zones + adapters + script tests
pnpm lint:fix && pnpm lint
pnpm check:deps && pnpm check:independence && pnpm check:domains && pnpm check:size
pnpm readme:check         # when READMEs/skills changed
pnpm --filter './examples/*' run build
pnpm pack:packages && pnpm check:standalone     # when exports/entries/packaging changed
```

A PR is done only when all of these pass **and** the change is covered by tests in the owning
package. Report anything not run or not verified; never claim a screen-reader check that was not
done (the manual NVDA/VoiceOver pass is the maintainer's).

## 6. Documentation rules (READMEs are checked)

`scripts/check-readmes.mjs` enforces, per unit and per language (EN/VI/CN): H1 = package name,
canonical `> **Note**` block, absolute links only, images `?raw=true`, **identical headings, code
blocks and table shapes** across languages (prose and table cells differ). Headings stay English in
every language. The generator used for stage 2 was a throw-away script; edit the three README files
of a unit together and keep their structure identical, then run `pnpm readme:check`. When a stage
changes what is shipped, update the `> **Note**` text in **every** README (root, core, 4 adapters ×
3 languages) and the readme-system skill profile.

## 7. Stage release routine (maintainer)

After a stage's last PR: `pnpm release:check` and `pnpm npm:publish:check` pass, tarballs inspected
(`dist/vendor/core/**` present, no `@zealakit/chrono-core` dependency, no `.css`), the maintainer
runs `pnpm npm:publish:all` and tags. Agents prepare the version bump (`package.json` of the five
packages), READMEs and release notes text only.
