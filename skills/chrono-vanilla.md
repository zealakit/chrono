---
name: chrono-vanilla
description: >-
  Use when adding @zealakit/chrono-vanilla to a plain DOM app: Calendar controllers, delegated listeners, styling hooks and lifecycle.
---

# Chrono for Vanilla

Use `@zealakit/chrono-vanilla` for headless Calendar views and a Mini Calendar. The package owns date
logic, navigation, keyboard support and ARIA wiring. You own all CSS and visual markup. Release 0.3.0
adds events. Date and Time inputs and panels exist (see below); DateTime components exist too (see below); do not invent others.

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

### Make events draggable

1. Turn on `createCalendar(root, { editable: true, onEventChange })`. Chrono only **proposes** `{ kind, event, from, to, source }`; it never changes `events`. Return `false` or a promise of `false` to reject; the event shows `data-pending` until your `events` hold the new times (or `pendingTimeout`).
2. Render `controller.getResizeHandleAttributes(segment, edge)` and `controller.getCellDragPreviewSegments(day)` with `getDragPreviewAttributes(piece)`.
3. In the app's CSS give events and handles `touch-action: none` and style `[data-dragging]`, `[data-pending]`, `[data-invalid]` and `[data-drag-preview]`. Chrono ships no CSS.
4. Optional: `snapDuration`, `validateEventChange`, `allowAllDayConversion`, `scrollContainer`, `keyboardShortcuts` (`M`, `R`, `Shift+R`).

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

## Time inputs and panels

`@zealakit/chrono-vanilla/time` (also exported from the root) adds `initTimeElements`, `createTimeInput`, `createTimeRangeInput`, `createTimePanel` and `createTimeRangePanel`. They hold a wall-clock time with no date and no time zone, and have no popup.

```html
<div id="opens" data-chrono-time-input data-name="opens"></div>
<div data-chrono-time-panel data-chrono-for="opens" data-layout="list" data-start="09:00" data-end="17:00" data-slot-duration="30"></div>
<script type="module">
  import { initTimeElements } from "@zealakit/chrono-vanilla/time";
  const stop = initTimeElements(document);
  document.addEventListener("chrono:valuecommit", (event) => console.log(event.detail.value));
</script>
```

- `layout="columns"` (default for a panel) shows one listbox per part; `layout="list"` shows times every `step` or slots (`slotDuration` or an explicit `slots` array whose `data` is yours). A range panel defaults to the list.
- `onValueChange` fires on every change (also a partial range); `onValueCommit` when a choice is complete. Close your popup on commit. `autoFocus` is off by default; Escape is never stopped unless it cancelled a range draft.
- `granularity` (`hour`, `minute`, `second`), `hourCycle` (`h12`, `h23`), `step` and `allowOvernight` (`23:00`–`02:00`); ranges are half-open `[start, end)`. A typed value off the `step` is kept and reported as `off-step`.
- `name` renders a hidden input (`09:30`); a range uses `name-start` and `name-end`.
- `getBookingSlots`, `parseTime` and `snapTime` are pure helpers. The foundation type `TimeInput` is exported as `TimeInputValue`; the slot type is `BookingSlot`.

## DateTime inputs and panels

`@zealakit/chrono-vanilla/datetime` (also exported from the root) adds `initDateTimeElements`, `createDateTimeInput`, `createDateTimeRangeInput`, `createDateTimePanel` and `createDateTimeRangePanel`. They compose the Date and Time controllers; the panel renders the date markup in `[data-chrono-datetime-date]` and the time markup in `[data-chrono-datetime-time]`.

```html
<div id="at" data-chrono-datetime-input data-time-zone="Asia/Ho_Chi_Minh" data-name="at"></div>
<div data-chrono-datetime-panel data-chrono-for="at" data-time-zone="Asia/Ho_Chi_Minh" data-disable-past data-default-time="09:00"></div>
<script type="module">
  import { initDateTimeElements } from "@zealakit/chrono-vanilla/datetime";
  const stop = initDateTimeElements(document);
  document.addEventListener("chrono:valuecommit", (event) => console.log(event.detail.value));
</script>
```

- The value is a `ZonedDateTime` with a `timeZone`, a `PlainDateTime` without one; never a string or a `Date`. `valueTimeZone` stores the same instant in another zone. A time in a daylight-saving gap keeps the typed wall time and sets `data-adjusted`; `disambiguation: "reject"` reports `nonexistent-time`.
- `min`, `max`, `disablePast`, `isTimeDisabled(time, date)` and `defaultTime` combine date and time limits. `onValueCommit` fires only when the time part commits (a range: when the end time commits). Close your popup on commit.
- `name` renders a hidden input (ISO with the offset for a zoned value); `formValue(value)` overrides it. Segmented mode is one group of parts; text mode is two labelled fields and a pasted date-time fills both.
- `DateTimeInputTimeZone` shows the display zone as text; picking a zone is your UI. `parseDateTime`, `resolveWall`, `getDayInstants` and `checkDateTimeRange` are pure helpers. The foundation type `DateTimeInput` is exported as `DateTimeInputValue`.

## Rules

- Chrono ships no CSS. Style `data-today`, `data-selected`, `data-outside-month`, `data-weekend`, `data-disabled`, `data-focused` and `data-slot-start` yourself.
- Call `calendar.syncFocus()` after every render and `calendar.destroy()` when removing the calendar.
- Imports: `@zealakit/chrono-vanilla` (root) and `@zealakit/chrono-vanilla/calendar` give the same bindings.
- Do not add a popup or CSS imports. Integrations (Overlay, Radix, Base UI) belong in your app.
