# Plan: stage 5d — Recurring events (`/calendar`) — part 1 of 2

> Part 1 of 2 of [`12-recurrence.md`](12-recurrence.md) (the index: scope, status and the part table). Section numbers (`§N`) are unchanged by the split. Shared rules: [`00-conventions-as-built.md`](00-conventions-as-built.md).

## 1. Decisions taken in this plan

| # | Topic | Decision | Why |
| --- | --- | --- | --- |
| RR1 | Series input | An event may carry `rrule` (RFC 5545 `RRULE` value string, e.g. `"FREQ=WEEKLY;BYDAY=MO,WE"`, or the parsed object), `exdates` and `rdates`. The event's `start`/`end` are the first occurrence (DTSTART) and its duration | Matches iCal/Google data, so apps pass stored series as they are |
| RR2 | Opt-in pack | `import { recurrence } from ".../calendar"` and pass `recurrence={recurrence}`. Without the pack, an event with `rrule` shows only its first occurrence and warns once in development (decided, §12.1) | The RRULE engine is sizeable; calendars that receive pre-expanded data do not pay for it |
| RR3 | Supported subset | `FREQ` = `DAILY` / `WEEKLY` / `MONTHLY` / `YEARLY`; `INTERVAL`; `COUNT`; `UNTIL`; `BYDAY` (with ordinals for monthly/yearly, e.g. `2TU`, `-1FR`); `BYMONTHDAY` (incl. negative); `BYMONTH`; `WKST`; plus `EXDATE` and `RDATE` through `exdates` / `rdates`. Anything else (`BYSETPOS`, `BYWEEKNO`, `BYYEARDAY`, `BYHOUR`, `HOURLY` …) is rejected: the event shows its first occurrence only and `onRecurrenceError(event, error)` fires (decided, §12.2) | The F10 subset plus the two parts needed for common yearly and weekly rules. Failing loudly beats expanding wrongly |
| RR4 | Semantics | RFC 5545: occurrences keep the **wall time** of DTSTART in the event's zone (or as plain wall time), so DST does not shift a 09:00 meeting. Invalid dates are skipped (monthly on the 31st skips short months; yearly Feb 29 only in leap years). `UNTIL` is inclusive. `COUNT` counts generated occurrences before `EXDATE` removal | Interoperable with other calendar software |
| RR5 | Range-limited expansion | Only occurrences that overlap `visibleRange` (looking back by the event's duration) are produced. Rules without `COUNT` jump straight to the range; rules with `COUNT` iterate from DTSTART with a 10,000-step cap (dev warning when hit). Expansions are cached per series (rule + DTSTART + exdates) and range | A ten-year daily series costs the same as one week of it |
| RR6 | Overrides | An event with `recurringId` (the series id) and `recurrenceId` (the original occurrence start) **replaces** that occurrence (RFC `RECURRENCE-ID`). It can move, change duration or carry different app fields | "This occurrence" edits must show correctly after the app saves them |
| RR7 | Occurrence identity | Each occurrence piece carries `event` (the series, or the override), `recurrence: { recurringId, occurrenceStart, isOverride }` and a stable key `${seriesId}:${occurrenceStart ISO}`. `data-recurring` stays (05 E21) | Selection, focus and pending state (09 M3) survive re-expansion |
| RR8 | Edit proposals | When an occurrence is moved or resized (09), the proposal gains `recurrence` (RR7 data). **Chrono never chooses the scope.** The app asks the user (its own dialog) and applies it; `onEventChange` can return a `Promise` while the dialog is open, so the pending piece stays (09 M3) | The scope question is UX the app owns; Chrono provides the data |
| RR9 | Apply helpers | Pure helpers return new data for the app to save: `applyRecurrenceChange(series, proposal, scope)` → `{ series?, override?, newSeries? }` for `"this"` (override), `"following"` (end the old series with `UNTIL` before the occurrence, start a new series from it; `COUNT` is split correctly) and `"all"` (shift the series DTSTART and keep the rule). `applyRecurrenceDelete(series, occurrenceStart, scope)` → `{ series?, removed? }` (`"this"` adds an `EXDATE`, `"following"` sets `UNTIL`, `"all"` removes the series) (decided, §12.3) | These are easy to get wrong (DST, COUNT, UNTIL in zones); shared helpers keep apps correct |
| RR10 | Parse and stringify | `parseRRule(string) → RRule` and `stringifyRRule(rule) → string` (subset only, RR3), exported for apps that edit rules in their own UI | Apps build their own recurrence editors |

---

## 2. Core

### 2.1 Files

```text
packages/core/src/calendar/recurrence/
├── rrule.ts            # RR3 parse / stringify / validate
├── expand.ts           # RR4–RR5 iteration per FREQ, BY* filters, ordinals, skip invalid dates
├── series.ts           # RR1 series normalization, exdates/rdates, overrides (RR6), cache
├── apply.ts            # RR9 helpers
└── pack.ts             # `recurrence` pack: plugs expansion into events/normalize (RR2)
```

`events/normalize.ts` (05) gets one hook: if a recurrence pack is registered, series are
expanded for `visibleRange` before layout. Without the pack the hook is a no-op (no import of
`recurrence/`). Same registry approach as the resource layouts (10 §2.1).

### 2.2 Options and exports

Calendar options: `recurrence?: RecurrencePack`, `onRecurrenceError?: (event, error) => void`.
Event input gains `rrule?`, `exdates?`, `rdates?`, `recurrenceId?`.

`/calendar` exports: `recurrence` (pack), `parseRRule`, `stringifyRRule`,
`expandRecurrence(series, range)` (depth-1 utility, works without a calendar),
`applyRecurrenceChange`, `applyRecurrenceDelete`, types. All are plain data/functions (no
`"use client"`, 04 C13), so they also run on the server — e.g. to expand series for an
agenda email or to validate in a server action.

### 2.3 Attributes

| Element | Additions |
| --- | --- |
| Event (occurrence) | `data-recurring` (existing), `data-override` on overridden occurrences, `aria-label` suffix from messages `recurring` ("recurring event") |

New default messages (English only): `recurring`.

---

## 3. Adapters

No new parts. Hooks expose the `recurrence` data on segments so render callbacks can show a
repeat icon. The keyboard and drag flows are unchanged (plans 05, 09). Vanilla templates read
the same segment data.

---

## 4. Tests

Core (four `TZ` zones):

| File | Proves |
| --- | --- |
| `recurrence/rrule.test.ts` | Parse/stringify round trip for the subset; every unsupported part rejected with a clear error |
| `recurrence/rfc-examples.test.ts` | The RFC 5545 §3.8.5.3 examples that fall inside the subset, as a golden table (expected occurrence lists copied from the spec) |
| `recurrence/expand.test.ts` | Each FREQ × INTERVAL; ordinals (`2TU`, `-1FR`); negative `BYMONTHDAY`; Feb 29 yearly; monthly 31st; `WKST` effect on weekly `INTERVAL=2`; `COUNT` with `EXDATE`; inclusive `UNTIL` in zoned and plain form; `RDATE` |
| `recurrence/dst.test.ts` | Weekly 09:00 series across New York and Lord Howe DST changes keeps 09:00; occurrences in a DST gap follow 03 D8 `"compatible"` |
| `recurrence/range.test.ts` | Range-limited expansion equals full expansion clipped to the range (seeded random rules); the 10,000-step cap |
| `recurrence/overrides.test.ts` | Overrides replace their occurrence, moved overrides outside the original day, override of an excluded date ignored with a warning |
| `recurrence/apply.test.ts` | `this` / `following` / `all` for change and delete, incl. COUNT split, UNTIL in zones, series starting on the edited occurrence |
| `bench.test.ts` (extend) | 500 weekly series in a month view < 10 ms (cached), first expansion reported. Report only |

Adapters: occurrence rendering with `recurrence` data, dragging an occurrence produces a
proposal with `recurrence`, pending while an async scope dialog is open, parity, no-styles,
and a bundle test proving the base `Calendar` without the pack reaches no `recurrence/` files.

---

## 5. Size budgets

| Entry | Ceiling (gzip) |
| --- | --- |
| `core/calendar` without packs | unchanged: 21 KB (plan 11) |
| `core/calendar` + `recurrence` | +6 KB on top of the configuration it is added to |
| `<adapter>/calendar` + `recurrence` | +6 KB on top of the configuration it is added to |

`check-size.mjs` gains "with recurrence" and "with both packs" entries.

---

## 6. Examples

- **Outlook shell**: a weekly stand-up (`FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR`), a monthly review
  (`BYDAY=-1FR`), a yearly birthday, an exception (`exdates`) and an override (moved occurrence).
  Dragging an occurrence opens the example's own "this / following / all" `<dialog>`; the
  example applies the choice with `applyRecurrenceChange` and updates its state.
- **Server use** (Next.js): a Server Component lists next week's occurrences with
  `expandRecurrence` (shows the utilities work on the server, 04 C13).

---

## 7. Docs and agent files

- Adapter READMEs (EN/VI/CN): recurrence section — enabling the pack, series input, the
  supported subset table (and what is rejected), DST behavior, overrides, the scope flow with
  apply helpers, server-side expansion.
- `skills/chrono-*.md`: "recurring events" steps, including the scope dialog recipe.
- `.agents/AGENTS.md` + skill: the RR3 subset as a hard boundary (adding a rule part needs a
  plan change and RFC examples in tests).

---

## 8. Delivery (PR breakdown)

| PR | Content |
| --- | --- |
| 1 | `rrule.ts` + `expand.ts` + RFC golden table + DST tests |
| 2 | `series.ts` (exdates, rdates, overrides, cache), range-limited expansion, `pack.ts`, normalize hook |
| 3 | `apply.ts` helpers + tests; proposal `recurrence` field (09) |
| 4 | React (segment data, docs snippets) |
| 5 | Vue |
| 6 | Svelte |
| 7 | Vanilla + parity |
| 8 | Examples, docs, size budgets. Version `0.8.0` |
| Release | Manual `0.8.0` on `latest` (04 §9 Release) |

PRs 5–7 can run in parallel after PR 4.

---

## 9. Definition of done

- All checks pass; examples build (incl. the Next.js server-side expansion page).
- F10 acceptance covered by core and adapter tests; RFC golden table passes; range-limited
  expansion matches full expansion on 1,000 seeded rules per run.
- The base `Calendar` without the pack contains no recurrence code.
- Parity identical across adapters.

---

## 10. Out of scope

- A recurrence editor component and natural-language rule descriptions ("every 2 weeks on
  Monday") — apps build them with `parseRRule` / `stringifyRRule`; candidates after 1.0.
- RRULE parts outside the RR3 subset (§12.2) and `HOURLY`/`MINUTELY`/`SECONDLY` frequencies.
- Recurring availability rules (11 §10) — possible later on top of this engine.
- iCalendar file import/export (`.ics`) — app or a separate library.

---

## 11. Changes to earlier plans

- **05:** `events/normalize.ts` gains the recurrence hook; event input gains `rrule`,
  `exdates`, `rdates`, `recurrenceId`.
- **09:** `EventChangeProposal` gains `recurrence` (RR8).
- **02 §4:** vocabulary gains `data-override`.

---

## 12. Open questions

1. ~~**Opt-in pack**~~ — **decided: opt-in.** Recurrence works only when the app passes
   `recurrence` (RR2).
2. ~~**`BYSETPOS`**~~ — **decided: leave it out** of v1. Rules using it are rejected with
   `onRecurrenceError` (RR3); candidate after 1.0.
3. ~~**Apply helpers**~~ — **decided: ship them.** `applyRecurrenceChange` and
   `applyRecurrenceDelete` return new data; the app still asks the user and saves (RR9).

All open questions are decided.

---
