---
name: chrono-vanilla
description: >-
  Use when adding @zealakit/chrono-vanilla to a plain DOM app: Calendar controllers, delegated listeners, styling hooks and lifecycle.
---

# Chrono for Vanilla

Use `@zealakit/chrono-vanilla` for headless Calendar views and a Mini Calendar. The package owns date
logic, navigation, keyboard support and ARIA wiring. You own all CSS and visual markup. Release 0.3.0
adds events. Date inputs and panels exist (see below); Time and DateTime components do not exist yet; do not invent them.

`@zealakit/chrono-core` is an internal kernel bundled inside the adapter and not published to npm.
Never install it or import from it in application code.

## Install

```bash
npm install @zealakit/chrono-vanilla
```

No peer dependencies. Never install `@zealakit/chrono-core`; it is bundled.

## Compose

Vanilla is controller-only: you render the markup and Chrono supplies state, attributes and behavior.

```ts
import { applyAttributes, createCalendar } from "@zealakit/chrono-vanilla";

const root = document.getElementById("calendar") as HTMLElement;
const calendar = createCalendar(root, { locale: "en-US", weekStartsOn: 1, onDateActivate: (date) => select(date) });

function render() {
  const { controller } = calendar;
  const state = calendar.getState();
  applyAttributes(root, controller.getRootAttributes());
  // build the DOM from state.layout, then stamp each element:
  //   applyAttributes(cell, controller.getCellAttributes(day));
  calendar.syncFocus();
}
calendar.subscribe(render);
render();
```

- Give navigation buttons `data-chrono-action="prev|next|today"` and view buttons `data-chrono-action="view"` plus `data-view`. Cells carry `data-chrono-key` from the attribute records. Listeners are delegated on `root`.
- `state.layout.kind` is `month`, `time-grid` or `list`; render the matching structure.
- Mini Calendar: `createMiniCalendar(root, { syncWith, isMarked, onNavigate })`.
- `onVisibleRangeChange(range, { view })` fires at creation and on change: load events for that range.

## Events

Pass `events` to `createCalendar`, render a cell's segments from `getCellEventSegments(day)`, and stamp each one with `getEventAttributes(segment)`.

```ts
for (const segment of calendar.controller.getCellEventSegments(day)) {
  const el = document.createElement("div");
  applyAttributes(el, calendar.controller.getEventAttributes(segment));
  cell.append(el);
}
```

- Getters: `getCellEventSegments`, `getEventAttributes`, `getMoreAttributes`, `getAllDayCellAttributes`, `getSelectionPreviewAttributes`, `getNowIndicatorAttributes`.
- Delegated listeners: `[data-chrono-event-key]` click selects, double-click activates, `[data-overflow]` calls `onMoreActivate`.
- `applyAttributes` writes `--chrono-event-*` to the element's `style`; you own the CSS.
- `selectable` plus `onSelectRange` for range creation; all-day ranges are exclusive on the end.

## Date inputs and panels

`@zealakit/chrono-vanilla/date` (also exported from the root) adds `initDateElements`, `createDateInput`, `createDateRangeInput`, `createDatePanel`, `createDateRangePanel` and `createMultiDatePanel`. They are unstyled and have no popup: open, position and close your own `<dialog>` or popover around them.

```html
<div id="when" data-chrono-date-input data-name="when"></div>
<div data-chrono-date-panel data-chrono-for="when" data-auto-focus></div>
<script type="module">
  import { initDateElements } from "@zealakit/chrono-vanilla/date";
  const stop = initDateElements(document);
  document.addEventListener("chrono:valuecommit", () => dialog.close());
</script>
```

- `initDateElements` reads options from `data-*` (`data-min`, `data-max`, `data-locale`, `data-mode`, `data-name`, `data-months`, ...), renders markup, dispatches `chrono:valuechange` and `chrono:valuecommit` (`detail.value` is an ISO string, range or list) and returns a cleanup. `data-chrono-for="<id>"` shares one value between a panel and an input.
- The controller-only `create*` functions delegate listeners on your root; render from `getState()` and stamp attribute records with `applyAttributes`. Call `syncFocus()` after each render.
- `autoFocus` is off by default. Escape is never stopped unless it cancelled a range draft.
- `getPresetRange("last7Days", { today })` and `matchPreset` are pure helpers for preset buttons you render yourself.

## Rules

- Chrono ships no CSS. Style `data-today`, `data-selected`, `data-outside-month`, `data-weekend`, `data-disabled`, `data-focused` and `data-slot-start` yourself.
- Call `calendar.syncFocus()` after every render and `calendar.destroy()` when removing the calendar.
- Imports: `@zealakit/chrono-vanilla` (root) and `@zealakit/chrono-vanilla/calendar` give the same bindings.
- Do not add a popup or CSS imports. Integrations (Overlay, Radix, Base UI) belong in your app.
