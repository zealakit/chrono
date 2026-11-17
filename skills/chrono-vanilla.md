---
name: chrono-vanilla
description: >-
  Use when adding @zealakit/chrono-vanilla to a plain DOM app: Calendar controllers, delegated listeners, styling hooks and lifecycle.
---

# Chrono for Vanilla

Use `@zealakit/chrono-vanilla` for headless Calendar views and a Mini Calendar. The package owns date
logic, navigation, keyboard support and ARIA wiring. You own all CSS and visual markup. Release 0.2.0
has no events, and no Date, Time or DateTime components yet; do not invent them.

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

## Rules

- Chrono ships no CSS. Style `data-today`, `data-selected`, `data-outside-month`, `data-weekend`, `data-disabled`, `data-focused` and `data-slot-start` yourself.
- Call `calendar.syncFocus()` after every render and `calendar.destroy()` when removing the calendar.
- Imports: `@zealakit/chrono-vanilla` (root) and `@zealakit/chrono-vanilla/calendar` give the same bindings.
- Do not add a popup or CSS imports. Integrations (Overlay, Radix, Base UI) belong in your app.
