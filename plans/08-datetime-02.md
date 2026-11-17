# Plan: stage 4c — DateTime domain (`/datetime`) — part 2 of 3

> Part 2 of 3 of [`08-datetime.md`](08-datetime.md) (the index: scope, status and the part table). Section numbers (`§N`) are unchanged by the split. Shared rules: [`00-conventions-as-built.md`](00-conventions-as-built.md).

## 6. Size budgets

| Entry | Ceiling (gzip) |
| --- | --- |
| `core/datetime` (own code only) | 6 KB |
| `<adapter>/datetime` (incl. reached date, time, foundation) | 48 KB |
| `<adapter>/root` | sum of the four subpath ceilings, minus shared code counted once (measured) |

---

## 7. Docs and agent files

- Adapter READMEs (EN/VI/CN): DateTime section — composition with Date/Time parts, value types
  by `timeZone`, display vs value zone, DST behavior, `disablePast`, `defaultTime`, commit
  rule, forms, recipes. A "which component do I need?" table across all four domains.
- Root README: all four subpaths available; both import styles with the full root import
  example from the BRD packaging decision (02 §2.7).
- `skills/chrono-*.md`: "date-time picker with time zones" steps.
- `.agents/AGENTS.md` + skill: stage 4 complete; the no-duplication rule for `datetime/` as a
  hard boundary.

---

## 8. Delivery (PR breakdown)

| PR | Content |
| --- | --- |
| 1 | Core `datetime/zone` + `constraints` + tests |
| 2 | Core `datetime/panel` (single + range) + tests |
| 3 | Core `datetime/input` + tests; `./datetime` core export; no-duplication test |
| 4 | React `/datetime` (+ shared segment renderer and context accessor moves in `src/shared/`) |
| 5 | Vue |
| 6 | Svelte |
| 7 | Vanilla + `initDateTimeElements` + parity |
| 8 | Examples, recipes, docs, size budgets |
| Release | Final **`0.4.0`** on `latest` (02 §9): version all packages to `0.4.0`, run the checks, the **maintainer** publishes without `--tag` (the publish script sends plain versions to `latest`), tag `v0.4.0`, GitHub release covering all of stage 4, smoke-test installs with all four subpaths. After it, `next` points to the last prerelease; the maintainer may move `next` to `0.4.0` |

PRs 5–7 can run in parallel after PR 4.

---

## 9. Definition of done

- All checks from 06 §9 pass with four subpaths; all examples and integration apps build.
- F17, F18 and the DateTime part of F19 covered by core and adapter tests.
- `/datetime` reaches no Calendar code; `datetime/` passes the no-duplication test.
- Parity snapshots identical across adapters; manual screen-reader check recorded.
- `0.4.0` installs from `latest` and builds with both import styles in every framework.

---

## 10. Changes to earlier plans

- **06 / 07:** `DateInputSegment` and `TimeInputSegment` move onto a shared segment renderer in
  the adapters' `src/shared/input/`, and their contexts are read through a shared accessor so
  DateTime containers can provide them (§3.1). No behavior or API change.
- **02 §4:** vocabulary gains `data-adjusted` and `data-offset`.

---

## 11. Out of scope

- A time-zone picker or zone search UI (apps build it; `getTimeZoneLabel` helps).
- Recurrence and calendar events (stage 5).
- Non-Gregorian calendars (02 §2.1).
- Popups and convenience fields (02 §2.2, §2.8).

---

## 12. Open questions

1. ~~**DateTimeInput text mode**~~ — **decided: two fields** (date + time) inside one
   `DateTimeInput`; paste of a full date-time fills both (X10).
2. ~~**DateTimePanel commit**~~ — **decided: on time commit only** (X8). Picking a date never
   commits, even when a time is already set.
3. ~~**DST time lists**~~ — **decided: show real instants** (X4): gap times left out, the
   repeated hour listed twice with offsets. Columns layout still uses `disambiguation`.

All open questions are decided.

---
