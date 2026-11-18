# Plan: Overlay-enhanced pickers (`@zealakit/chrono-picker-*`)

Status: **implemented in part** against Overlay `1.0.0` (the four `chrono-picker-<fw>` packages with Date, Time and DateTime pickers and their range variants, `check-deps`/`check-domains`/`check-size`/`pack-packages`/`check-standalone` rules and tests, READMEs in three languages). The Overlay `1.1.0` prerequisites O1–O4 were not available, so the picker works around them (plan §3 fallback): it disables Overlay's outside press and Escape and decides them itself, and returns focus itself. React anchors the popup to the field (Overlay `anchor`); Vue and Svelte anchor to the trigger because Overlay `1.0.0` has no anchor option there. Not yet: `npm-publish.ts` support for the picker packages, the `picker-parity.json` fixture, SSR tests, the `examples/*-overlay` switch and the `1.1.0` release.

Order: **14**. Runs after `13-ecosystem.md` (`1.0.0`). Ships with Chrono **`1.1.0`** (lockstep,
04 C15). This is the "convenience Input + Panel fields" item from 02 §2.2 and 13 §12, built on
Zealakit Overlay.

Goal: give apps a ready-made **DatePicker, TimePicker and DateTimePicker** (plus range
variants), so they don't each have to put an Input, a trigger, a popover and a Panel together
themselves. Do it **without** changing the independence of core and the four adapters.

**Scope rule:**
- New packages only: `@zealakit/chrono-picker-{vanilla,react,vue,svelte}`.
- Core and `@zealakit/chrono-{vanilla,react,vue,svelte}` do not change. They keep every rule
  in 02 §2.8 (I1–I8): no Overlay, no popup code, nothing new in their dependency fields.
- Pickers are built **only from public APIs**: Chrono's Input and Panel exports and Overlay's
  Popover exports. No imports from `@zealakit/chrono-core`, no deep imports, no copied
  internals (02 §2.2 "never restrict lower-level composition").
- No CSS, no visual styles (02 §2.8 styling rules apply to picker packages too).

---

## 1. Decisions

| # | Topic | Decision | Why |
| --- | --- | --- | --- |
| P1 | Packaging | Four **separate** packages `@zealakit/chrono-picker-<fw>` in `packages/picker-<fw>/`. Not a `./picker` subpath of the adapters | The adapters keep I2 ("no Zealakit sibling dependency") word for word. Apps that use only Calendar/Input/Panel never see Overlay in their tree |
| P2 | Overlay dependency | `peerDependencies: { "@zealakit/overlay-<fw>": "^1.0.0" }`, **required** (not optional): the package exists only to combine the two | One Overlay copy in the app, version chosen by the app, shared with the app's own dialogs and popovers |
| P3 | Chrono dependency | `peerDependencies: { "@zealakit/chrono-<fw>": "^<same minor>" }`, not `dependencies` | The app also imports `DateInput`/`DatePanel` types and utilities. A peer keeps one Chrono copy |
| P4 | Framework peer | Same as the adapter: React `^18 \|\| ^19` + `react-dom`, Vue `^3.5.0`, Svelte `^5.20.0`, Vanilla none | Matches 00 conventions |
| P5 | Not `dependencies` | Overlay is never a regular dependency and never bundled/vendored into the tarball (no `bundle-core`-style step) | Duplicate copies, larger bundles, and two separate configs. Overlay's page state uses `Symbol.for("@zealakit/overlay-core/v<STATE_VERSION>/…")`, so copies with the same state version do share a layer stack, but a `STATE_VERSION` bump would split it. A peer avoids the whole question |
| P6 | Not `devDependencies` only | Picker `dist` imports Overlay at runtime, so a devDependency alone would fail in the app. Overlay **is** also listed in `devDependencies` (from the npm registry) so picker tests and builds can run, as is normal for peers | — |
| P7 | Versioning | Lockstep with Chrono (`1.1.0` first). Overlay range moves only on an Overlay major | One version line for the maintainer, like the adapters |
| P8 | Composition model | A picker is a compound component: `Root` (value + open state), `Input` (the Chrono Input), `Trigger` (Overlay trigger), `Content` (Overlay popup with the Chrono Panel inside). Every part accepts the same props as the part it wraps, plus `asChild` in React | Apps can restyle or swap any part. Lower-level composition stays available |
| P9 | Close behavior | Close on the Panel's `onValueCommit` (single: on pick; range: after the end is picked). Overlay handles Escape, outside press and focus return | Same recipe as 06 §4 examples, now packaged |
| P10 | Focus | Opening moves focus into the Panel (Panel `autoFocus`, 06 A8). Closing returns focus to the Trigger (Overlay `restoreFocus`). Focus is not trapped (Overlay `trapFocus: false`, non-modal), so Tab leaves the popup and closes it | Standard date-picker dialog pattern (WAI-ARIA APG "Date Picker Dialog") |
| P11 | Keyboard on the Input | `Alt+ArrowDown` on the Input opens the popup; typing never opens it | APG combobox/date-picker convention; segment editing stays undisturbed |
| P12 | ARIA | Trigger: `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls` (from Overlay). Popup: `role="dialog"`, `aria-label` from Chrono's locale strings ("Choose date", "Choose time", "Choose date and time") | Screen readers announce what opens |
| P13 | Escape during a range preview | First Escape cancels the range preview inside the Panel, second Escape closes the popup. The picker stops propagation only while a preview is active | 02 §2.2 lets Chrono handle Escape inside its components; the picker decides which wins |
| P14 | Vanilla | `createDatePicker(root, options)` controllers plus declarative `initDatePickers()` reading `data-chrono-picker` markup, mirroring Overlay's `initOverlays` and Chrono's `initDateElements` | Same two styles the vanilla packages already offer |

---

## 2. Components (per framework)

| Domain | Single | Range |
| --- | --- | --- |
| Date | `DatePicker` | `DateRangePicker` (2-month Panel by default, 06 A4) |
| Time | `TimePicker` | `TimeRangePicker` |
| DateTime | `DateTimePicker` | `DateTimeRangePicker` |

Parts for each: `Root`, `Input`, `Trigger`, `Content` (with Overlay's positioning props:
`side`, `align`, `sideOffset`, `collisionPadding`, `portal`, `animation`), `Panel`. In React
and Vue they are exposed as `DatePicker.Root` … and as named exports (`DatePickerRoot` …),
matching the adapters. Value props (`value`, `defaultValue`, `onValueChange`, `min`, `max`,
`locale`, `timeZone`, constraints) are passed through to Chrono unchanged; open props (`open`,
`defaultOpen`, `onOpenChange`) are passed through to Overlay.

The Popover is **anchored to the Input group** (Overlay `anchor`), not the trigger icon, so the
popup lines up with the field.

---

## 3. Overlay prerequisites (changes in the Overlay repo, released first)

Found while checking Overlay `1.0.0` for this plan. Each is a small, generic Overlay feature,
not Chrono-specific, and ships in an Overlay minor (`1.1.0`) before picker work starts.

| # | Gap in Overlay 1.0 | Needed change |
| --- | --- | --- |
| O1 | Outside press counts only `content` and `trigger` as inside (`overlay-controller.ts`). Clicking the Input segments, which sit in the anchor but are not the trigger, closes the popup | Option `insideElements` (React/Vue/Svelte prop on Root, Vanilla option) listing extra elements treated as inside for outside-press and focus-out |
| O2 | `dismissOnOutsidePress` is boolean only | Also accept a predicate `(event) => boolean` |
| O3 | `onOpenChange` reasons have no value for programmatic close after a commit | Add a `"programmatic"` (or `"commit"`) reason so apps can tell a pick from a dismissal |
| O4 | Restoring focus always goes to the trigger | `restoreFocus` also accepts an element (or `false`) so a picker opened from the Input with `Alt+ArrowDown` returns focus to the Input |

If Overlay declines any of these, the picker works around it locally (e.g. making the anchor
wrapper the outside-press boundary) and the plan records it. The picker's peer range becomes
`^1.1.0` once O1–O4 ship.

---

## 4. Changes to Chrono tooling

- **`scripts/check-deps.mjs`:** add allowlist rows for `picker-*`:

  | Package | `dependencies` | `peerDependencies` | `devDependencies` |
  | --- | --- | --- | --- |
  | picker-vanilla | none | `@zealakit/chrono-vanilla`, `@zealakit/overlay-vanilla` | test tooling + the two peers |
  | picker-react | none | `@zealakit/chrono-react`, `@zealakit/overlay-react`, `react`, `react-dom` | test tooling + peers + React types |
  | picker-vue | none | `@zealakit/chrono-vue`, `@zealakit/overlay-vue`, `vue` | test tooling + peers |
  | picker-svelte | none | `@zealakit/chrono-svelte`, `@zealakit/overlay-svelte`, `svelte` | test tooling + peers + Svelte tooling |

  The deny-list for `@zealakit/overlay` and other UI libraries stays in force for core and
  the four adapters. Add a test that `picker-*` listing Overlay under `dependencies` fails.
  `@zealakit/chrono-<fw>` in devDependencies uses `workspace:^`; Overlay comes from the
  npm registry (I3: no `link:`/`file:` to the Overlay repo).
- **`scripts/check-domains.mjs`:** picker packages may import only `@zealakit/chrono-<fw>` (root
  or domain subpaths), `@zealakit/overlay-<fw>` and their framework. Never
  `@zealakit/chrono-core`, never another picker package.
- **`scripts/pack-packages.mjs` / `npm-publish.ts`:** add the four picker packages. No core
  bundling for them (they don't depend on core). The `.css` tarball check applies.
- **`scripts/check-standalone.mjs`:** for each picker tarball, an empty project with the
  framework, the matching Chrono adapter tarball and Overlay from npm; import every entry,
  render one `DatePicker`, Vite build. The existing adapter-only standalone check stays as it
  is: it proves the adapters still work with no Overlay installed.
- **`size-budgets.json`:** one entry per picker package (gzip, excluding peers). Ceiling 6 KB.
- **`pnpm test` / `pnpm build`:** include `picker-*` after the adapters (topological order).

---

## 5. Tests

Node test runner + happy-dom, same as the adapters. Per framework:

1. Opens from the Trigger and from `Alt+ArrowDown` on the Input; focus lands in the Panel.
2. Picking a date commits, closes, and returns focus to the Trigger (or Input, O4).
3. Range: first pick keeps it open, second pick commits and closes.
4. Clicking a segment of the Input while open does not close (O1).
5. Escape with a range preview cancels the preview only; the next Escape closes (P13).
6. Controlled `open` and controlled `value` both work; `onOpenChange` reasons are correct.
7. ARIA attributes from P12 are present; no `style` other than Overlay's positioning and
   `--chrono-*`/`--popover-*` properties.
8. SSR render (React/Vue/Svelte) touches no DOM.
9. Parity: the four packages render the same attribute contract for the closed and open
   states (new fixture `tests/fixtures/picker-parity.json`).

---

## 6. Docs and examples

- Package READMEs (EN/VI/CN) for the four picker packages, per the readme-system skill. Each
  starts with "Install `@zealakit/chrono-<fw>`, `@zealakit/overlay-<fw>` and
  `@zealakit/chrono-picker-<fw>`" and links to the "compose it yourself" recipe for apps that
  use another popup library.
- Root README: packages table gains the picker row group, marked "optional, needs Overlay".
- `skills/chrono-*.md`: a "Ready-made picker" section next to the existing "build a date picker
  with your own popup" steps.
- Examples: `examples/{react,vue,svelte}-overlay` switch their main recipe to the picker
  package and keep the hand-composed version as a second section. `examples/react-radix`,
  `react-base-ui` and vanilla `<dialog>` stay hand-composed.

---

## 7. Changes to earlier plans (applied)

| Plan | Section | Change |
| --- | --- | --- |
| 01 | §4.4, §4.5, §5 | **Done:** rule scoped to core + adapters, pointer to this plan |
| 02 | §2.2 | **Done:** scope note at the top: rules apply to core and the four adapters; ready-made pickers live in `chrono-picker-*` |
| 02 | §2.8 table, I2 | **Done:** pointer to the §4 picker rows; I2 scoped to core + adapters, Overlay allowed only as a picker peer |
| 02 | §10, §11 Q2, Q8 | **Done:** "revised by plan 14" notes |
| 13 | §12 | **Done:** "convenience Input + Panel fields" struck, moved to this plan |
| `.agents/AGENTS.md`, `rules/chrono.mdc`, `skills/chrono/SKILL.md` | Independence / No popup code | **Done:** same scoping, picker packages marked "planned". Quick map and commands gain the picker packages in PR 2, when they exist |

---

## 8. Delivery

| PR | Content |
| --- | --- |
| 0 (Overlay repo) | O1–O4, Overlay `1.1.0` published by the maintainer |
| 1 | Plan amendments (§7), `check-deps`/`check-domains` rules + tests. Tooling only: no package folders yet, because empty entry points are not allowed |
| 2 | `picker-react` with Date pickers, tests, README |
| 3 | `picker-vue`, `picker-svelte`, `picker-vanilla` Date pickers, parity fixture |
| 4 | Time and DateTime pickers in all four |
| 5 | Examples, skills, root README, size budgets; `1.1.0` release checklist (13 §6) |

---

## 9. Definition of done

`pnpm check`, `pnpm readme:check`, `pnpm check:standalone` pass (both the Overlay-free adapter
check and the picker check). `grep -rn overlay packages/{core,vanilla,react,vue,svelte}/package.json`
finds nothing. Examples build. The adapters' tarballs and size budgets are unchanged by this
plan.

---

## 10. Out of scope

Pickers on Radix, Base UI or other popup libraries (they stay recipes in examples). A
time-zone picker. Mobile "bottom sheet" presentation (apps can pass Overlay `Dialog` parts
themselves). Any change to Calendar views.

---

## 11. Open questions

1. **Package name** — `chrono-picker-<fw>` (assumed) or `chrono-overlay-<fw>`, which says what
   it depends on rather than what it does?
2. **Ship before 1.0?** — assumed after `1.0.0` (02 §2.2 "after 1.0"). Shipping in `0.x` would
   let users try it earlier but adds a second unstable surface.
3. **Overlay prerequisites** — land O1–O4 in Overlay first (assumed), or start with local
   workarounds and switch later?
