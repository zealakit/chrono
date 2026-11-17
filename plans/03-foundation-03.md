# Plan: stage 1 — Foundation (`@zealakit/chrono-core/foundation`) — part 3 of 3

> Part 3 of 3 of [`03-foundation.md`](03-foundation.md) (the index: scope, status and the part table). Section numbers (`§N`) are unchanged by the split. Shared rules: [`00-conventions-as-built.md`](00-conventions-as-built.md).

## 5. Tests

Harness from plan 01: `node:test` + `node:assert/strict`, tests import `../dist/…`.

**Time zone matrix.** Core's `test` script runs the whole suite once per zone:
`UTC`, `America/New_York`, `Asia/Ho_Chi_Minh`, `Australia/Lord_Howe`. A tiny runner
(`packages/core/scripts/test-tz.mjs`) spawns `node --test` with `TZ` set and fails if any run
fails. Plain-date results must be identical in every zone. That proves no local-time leak.

| Test file | What it proves |
| --- | --- |
| `epoch-day.test.ts` | Round trip `fromEpochDay(toEpochDay(d)) = d` for **every day 0001-01-01 … 9999-12-31** (≈3.65 M checks, still < 1 s), and equality with `Date.UTC` as an oracle for 1900–2100 |
| `plain-date.test.ts` | Leap years (1900, 2000, 2024, 2100), month-end overflow (D5) incl. Feb 29 + 1 year, negative amounts, year bounds (D3), frozen results, invalid input errors |
| `plain-time.test.ts` | Wrap at midnight with `dayDelta`, seconds of day round trip |
| `week.test.ts` | ISO week 53 years (2020, 2026), week 1 starting in December, locale weeks for `en-US`, `de-DE`, `ar-EG` (Saturday start), `he-IL` |
| `zoned.test.ts` | Every 2026 DST transition in New York and Lord Howe (30-min shift), gap + overlap with all four disambiguations, Ho Chi Minh (no DST), `isValidTimeZone` |
| `iso.test.ts` | Valid/invalid ISO forms, round trip `parse(toIsoString(x)) = x`, offsets and `[Zone]` suffix |
| `convert.test.ts` | `Date` ↔ plain values under every `TZ`, Temporal-like duck typing |
| `clock.test.ts` | `today()` with injected `now` near midnight in different zones |
| `locale.test.ts` | Week info for `en-US`, `en-GB`, `vi-VN`, `zh-CN`, `ar-EG`, `fa-IR`. Fallback table agrees with `Intl` where available. Month/weekday names, hour cycle (`en-US` h12, `vi-VN` h23), RTL detection, date part order (`en-US` M/D/Y, `vi-VN` D/M/Y, `zh-CN` Y/M/D) |
| `format.test.ts` | Plain values format the same in every `TZ` (no shift) |
| `constraints.test.ts` | Status order and reasons, range checks with every reason, time step/snap, `createAvailability` vs a brute-force day loop on random data (seeded generator, no library) |
| `ranges.test.ts` | Inclusive vs half-open edges, `splitIntervalByDay` across midnight and across DST days |
| `grid.test.ts` | Month grids for all 7 `weekStartsOn` values, `fixedWeeks`, Feb in leap/non-leap years, week numbers, multi-month continuity, year/decade grids, time axis with step 15/30/60 and working hours |
| `grid-navigation.test.ts` | Every key at day/month/year level, `rtl` swap, clamping at min/max, disabled dates not skipped |
| `labels.test.ts` | Label text for `en-US` with each status, message overrides |
| `store.test.ts` | Notify/skip, controlled vs uncontrolled, `equals` suppresses events |
| `global-state.test.ts` | Two module copies share state through the `Symbol.for` key |
| `bench.test.ts` | `getMonthGrid` < 1 ms (median of 1,000), `createAvailability` lookups. Prints results, does not fail CI (02 §7) |

Tests require full ICU (Node's default build). The runner fails early with a clear message if
`Intl` reports a small-ICU build.

---

## 6. Packaging and size

- Core `package.json` gains the `./foundation` export
  (`{ types, import, default }` → `dist/foundation/index.js`). Root `.` re-exports it.
- `scripts/bundle-core.mjs` already rewrites `@zealakit/chrono-core/<sub>` (plan 01 §4.4).
  `pnpm pack:packages` must still pass. Adapters import nothing from core yet, so the tarballs
  only prove the vendoring path.
- Size budget (report only, via `node:zlib` gzip over `dist/foundation/**/*.js`): **≤ 10 KB
  gzip** for the whole foundation. The monitor shows it. Stage 2 can tighten it.
- `sideEffects: false` stays. A test imports `dist/foundation/index.js` and asserts no global
  was created and no `Intl` formatter was built at import time.

---

## 7. Docs and agent files

- `packages/core/README{,_VI,_CN}.md` — internal module map for contributors (foundation
  folders, conventions D1–D15). Still states core is internal and never installed directly.
- Adapter READMEs, root README, `skills/chrono-*.md` — unchanged (no public API yet).
- `.agents/AGENTS.md` — add `pnpm check:domains` to Commands and the folder rules table (§4)
  to Hard boundaries. Add the conventions: 1-based months, Monday = 1, inclusive date ranges vs
  half-open intervals, no local time zone in `values/`, `now`/`locale` injection.
- `.agents/skills/chrono/SKILL.md` — foundation map and "where does new logic go" rules.

---

## 8. Delivery (PR breakdown)

Each PR keeps `pnpm check` green.

| PR | Content |
| --- | --- |
| 1 | `values/` (types, epoch day, plain date/time/date-time, compare, week, ISO, convert, clock) + tests + TZ-matrix runner |
| 2 | `values/zoned.ts` + zoned tests |
| 3 | `locale/` + tests |
| 4 | `ranges/` + `constraints/` + tests |
| 5 | `grid/` + `a11y/` + tests + benchmark |
| 6 | `store/` + tests, `check-domains.mjs` + fixtures, `./foundation` export, docs and agent files. Version bump to `0.1.0` on all packages (no publish) |

Commit style follows the repo (e.g. `feat(core): add plain date values`). Work happens on a
branch, not on `main`.

---

## 9. Definition of done

- `pnpm build`, `pnpm typecheck`, `pnpm test` (core under all four zones), `pnpm lint`,
  `pnpm check:deps` (core still has zero runtime dependencies, 02 §2.8), `pnpm check:domains`, `pnpm readme:check`, `pnpm pack:packages` all exit 0.
- Every function in §3 has tests. No function exists that §3 does not list.
- No file under `foundation/values` references the host's local time zone (checked by a test
  that greps `dist/foundation/values` for `getHours(`, `getDate(`, `getMonth(`,
  `getFullYear(`, `getDay(` and `setHours(` — only UTC getters are allowed).
- Benchmark and size numbers are recorded in the stage-1 PR description.
- No adapter export changed.

---

## 10. Out of scope (later stages)

- Domain folders and anything that renders: calendar navigation and views (stage 2), event
  layout (stage 3), Inputs and Panels (stage 4).
- Locale-aware **text** parsing for `text` mode inputs (02 §2.2a) — `date/input`,
  `time/input`, stage 4. Foundation only exposes `getDatePartOrder()` and strict ISO parsing.
- Live-region announcer, DOM focus management, pointer handling.
- Recurrence rules (stage 5).
- Non-Gregorian calendars (02 §2.1).

---

## 11. Open questions

1. ~~**Translated a11y messages**~~ — **decided: English defaults only.** Apps translate by
   passing `messages` overrides per component (D13). No VI/CN message sets in core.
2. ~~**Size budget**~~ — **decided: report only** in stage 1. `04-calendar-views.md` sets a
   hard CI gate once real bundle numbers exist.

All open questions are decided.
