# Plan: stage 2 — Calendar views and navigation (`/calendar`) — part 3 of 3

> Part 3 of 3 of [`04-calendar-views.md`](04-calendar-views.md) (the index: scope, status and the part table). Section numbers (`§N`) are unchanged by the split. Shared rules: [`00-conventions-as-built.md`](00-conventions-as-built.md).

## 5. Tests

Core (runs under the four `TZ` zones, 03 §5):

| File | Proves |
| --- | --- |
| `calendar/view-definition.test.ts` | Built-ins, custom merge, unknown id fallback, `setRange` ad-hoc view |
| `calendar/range.test.ts` | Range + visible range for every built-in × all 7 `weekStartsOn` × month ends (Jan 31, Feb 28/29, Dec 31), year alignment, hidden days |
| `calendar/navigate.test.ts` | prev/next/today/goTo/setView/setRange, min/max clamping, focus kept or moved on view change, multi-month paging by `length` |
| `calendar/title.test.ts` | Titles for every layout in `en-US`, `vi-VN`, `zh-CN`, `ar-EG`, across month and year boundaries |
| `calendar/layouts.test.ts` | Month (incl. multi-month, `fixedWeeks`, week numbers), time grid (step, working hours, hidden days), list |
| `calendar/controller.test.ts` | Controlled vs uncontrolled `view`/`date`, `onVisibleRangeChange` fires once at start and only on real change, `setOptions` with equal values does not notify, keyboard map incl. RTL, `onDateActivate` |
| `calendar/mini-calendar.test.ts` | Sync with main range (C11), own paging, marked days, `onNavigate` |
| `calendar/highlight.test.ts` | `selectedDate` / `highlightedDates` (array and predicate) mark the right cells in every layout and the Mini Calendar; nothing changes them except the app (C16) |
| `calendar/attributes.test.ts` | Attribute records for every element in §2.5. No record contains `style` or `class` (02 §2.8) |
| `bench.test.ts` (extend) | Controller update (next month) < 2 ms. Report only |

Adapters (each of react, vue, svelte, vanilla):

| File | Proves |
| --- | --- |
| `calendar.test.ts` | Renders each view, nav buttons, view buttons, controlled/uncontrolled, no Provider |
| `calendar-keyboard.test.ts` | Arrow/Home/End/Page keys move focus and `tabindex`, navigation when leaving the range, Enter → `onDateActivate` |
| `mini-calendar.test.ts` | Sync, marked days, `onNavigate` |
| `parity.test.ts` | Runs the shared scenarios from `tests/fixtures/calendar-parity.json` (repo root, read-only data) and compares normalized `data-*` / ARIA snapshots. All four adapters must produce identical snapshots |
| `ssr.test.ts` (React, Vue, Svelte) | Server render with `now` + `locale` equals the client's first render |
| `directives.test.ts` (React) | Every `dist` file that defines a component or hook starts with `"use client"`; no entry file (`dist/index.js`, `dist/<domain>/index.js`) and no utility re-export module has it. Runs for every subpath as it is added (stages 3–4) |
| `entries.test.ts` | §4 |
| `no-styles.test.ts` | Rendered markup of every part has no `style` attribute and no class the consumer did not pass. `dist` contains no `.css` and no CSS import (02 §2.8) |

Manual a11y check (02 §7): VoiceOver (Safari) and NVDA (Firefox) on the React example —
grid navigation, title announcements, disabled bounds. Results go in the PR description.

---

## 6. Size gate (`scripts/check-size.mjs`)

- Walks the import graph from each entry in `dist` (reuses the `check-domains.mjs` walker),
  concatenates the reachable files, gzips with `node:zlib`, compares to a budget.
- Budgets live in `size-budgets.json` at the repo root, per entry:
  `core/foundation`, `core/calendar`, and for each adapter `root` and `calendar` (adapter code
  + vendored core actually reached).
- First values: measured size **+15 %**, rounded up to the next 0.5 KB, with these ceilings
  (if a measurement is above its ceiling, the PR must shrink code, not raise the ceiling):

  | Entry | Ceiling (gzip) |
  | --- | --- |
  | `core/foundation` | 10 KB (03 §6) |
  | `core/calendar` | 6 KB |
  | `<adapter>/calendar` (incl. reached core) | 20 KB |

- Wired into `pnpm check` and `pnpm release:check`. The monitor shows the same numbers.
- Raising a budget needs a line in the PR description saying why.

---

## 7. Examples

Each framework example (`examples/{vanilla,react,vue,svelte,nextjs}`) becomes an
"Outlook-like shell" with plain CSS:

- Toolbar: prev / today / next, title, view buttons (month, week, work week, day, agenda,
  3-day custom view).
- Sidebar: `MiniCalendar` synced with the main calendar, a few `isMarked` days from static data.
- Main area: the active view, no events (a note says events arrive in 0.3.0).
- All CSS belongs to the example app (`src/styles.css`). The example shows that the same
  components look completely different by swapping that file. No Chrono package ships or
  imports CSS (02 §2.8).
- No third-party UI library in these examples. Integration example apps
  (`examples/<framework>-<library>`, 02 §2.8) start in stage 4 with the Input + Panel recipes.
- Shows **both import styles**: root import in one file, `/calendar` import in another
  (02 §2.7).
- Next.js: server-rendered page passing `now` and `locale` from the server (SSR proof). A
  **Server Component** in the example imports `getCalendarTitle` from
  `@zealakit/chrono-react/calendar` (and from the root entry) and calls it during the server
  render; `next build` must succeed and the page must show the title. Later stages extend this
  page with `/date`, `/time`, `/datetime` utilities (e.g. `checkDateRange`, `snapTime`).

---

## 8. Docs and agent files

- Adapter READMEs (EN/VI/CN): first real API section — install, both import styles, parts
  table, options table, attribute contract table, keyboard table, SSR note (`now`, `locale`),
  RSC note (React: components are client components; utilities from any entry work in Server
  Components and server actions). readme-system rules apply; `pnpm readme:check` must pass.
- Root README: packages table moves from "in development" to "0.2.0 — Calendar views"; add a
  short "what is available" list (Calendar only).
- `skills/chrono-{vanilla,react,vue,svelte}.md`: Calendar integration steps.
- `.agents/AGENTS.md` + skill: scope line updated to "Calendar views shipped (stage 2)",
  `pnpm check:size` in Commands, the size-budget rule and the C13 directive rule ("`use client`
  only on component and hook modules, never on entry files") in Hard boundaries.
- Core README: `calendar/` module map.

---

## 9. Delivery (PR breakdown)

| PR | Content |
| --- | --- |
| 1 | Core `calendar/navigation` + `views` (pure) + tests. Foundation additions (§2.1) |
| 2 | Core controllers + attribute contract + tests. `./calendar` core export |
| 3 | `check-size.mjs` + `size-budgets.json` + `entries.test.ts` scaffolding |
| 4 | React `/calendar` + tests |
| 5 | Vue `/calendar` + tests |
| 6 | Svelte `/calendar` + tests |
| 7 | Vanilla `/calendar` + tests, parity fixture complete across all four |
| 8 | Examples, READMEs (EN/VI/CN), skills, agent files. Version `0.2.0` on all packages |
| Release | After PR 8 is merged to `main`: `pnpm release:check` and `pnpm npm:publish:check` pass, the tarballs are inspected (§10), then the **maintainer** runs `pnpm npm:publish:all` (four adapters; core is never published), and tags `v0.2.0`. A GitHub release lists what 0.2.0 contains and what is missing (events, pickers) |

PRs 4–7 can run in parallel after PR 3 (separate packages, no shared files except the parity
fixture, which PR 2 creates and PRs 4–7 only read).

---

## 10. Definition of done

- `pnpm build`, `typecheck`, `test`, `lint`, `check:deps`, `check:domains`, `check:size`, `readme:check`,
  `pack:packages` exit 0. All examples build, including Next.js SSR, and the Next.js Server
  Component calling a `/calendar` utility renders on the server (C13).
- F1 and F2 acceptance (02 §5) covered by core and adapter tests.
- Parity snapshots identical across the four adapters.
- Manual screen-reader check recorded.
- Packed tarballs contain `dist/calendar/` and `dist/vendor/core/{foundation,calendar}/` and no
  `@zealakit/chrono-core` dependency.
- After publishing: a fresh project installs `@zealakit/chrono-react@0.2.0` from npm and
  builds with both import styles (root and `/calendar`). Same smoke check for Vue, Svelte and
  Vanilla. `@zealakit/chrono-core` is not on npm.

---

## 11. Out of scope (later stages)

- Events of any kind, overflow, now-indicator, live clock, slot focus and selection (stage 3).
- Live-region announcer (stage 3).
- Drag, resize, resources, timeline, availability backgrounds, recurrence (stage 5).
- `/date`, `/time`, `/datetime` entries (stage 4). Month/year picker UI inside the calendar
  header is the app's (it can use `goTo`).
- Release automation (CI publishing, changesets, provenance) — **not planned**: every release
  is manual, like Overlay and Disclosure (C15, plan 13).

---

## 12. Open questions

1. ~~**Publish 0.2.0 to npm?**~~ — **decided: publish 0.2.0 by hand** after this stage, then each
   stage release the same way, always manual (C15, §9 Release, plan 13).
2. ~~**Agenda default length**~~ — **decided: 7 days**, starting on the anchor date.
   Apps change it through `views` (§2.2).

All open questions are decided.
