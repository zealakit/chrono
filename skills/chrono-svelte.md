---
name: chrono-svelte
description: >-
  Use when adding @zealakit/chrono-svelte to a Svelte 5 app: Calendar views, the Mini Calendar, bound state, styling hooks and SvelteKit.
---

# Chrono for Svelte

Use `@zealakit/chrono-svelte` for headless Calendar views and a Mini Calendar. The package owns date
logic, navigation, keyboard support and ARIA wiring. You own all CSS and visual markup. Release 0.3.0
adds events. Date and Time inputs and panels exist (see below); DateTime components exist too (see below); do not invent others.

`@zealakit/chrono-core` is an internal kernel bundled inside the adapter and not published to npm.
Never install it or import from it in application code.

## Install

```bash
npm install @zealakit/chrono-svelte
```

Peer dependency: `svelte` (^5.20). Never install `@zealakit/chrono-core`; it is bundled.

## Compose

```svelte
<script lang="ts">
  import { Calendar, CalendarMonthGrid, CalendarNextButton, CalendarPrevButton, CalendarTitle } from "@zealakit/chrono-svelte";
  let view = $state("month");
</script>

<Calendar bind:view locale="en-US" weekStartsOn={1} onDateActivate={(date) => select(date)}>
  <CalendarPrevButton>Prev</CalendarPrevButton>
  <CalendarTitle />
  <CalendarNextButton>Next</CalendarNextButton>
  <CalendarMonthGrid class="month" />
</Calendar>
```

- Views: `CalendarMonthGrid`, `CalendarTimeGrid` and `CalendarAgenda`. Render all three; the inactive ones render nothing.
- Snippets: `CalendarTimeGrid` gives `{ days, slots }`, `CalendarAgenda` gives `days`, `CalendarMonthGrid` gives `day` for cell content.
- `bind:view` controls the view. For `date`, pass `date` and `onDateChange`.
- Mini Calendar: `MiniCalendar` with `syncWith={{ date, visibleRange }}`, `isMarked`, `onNavigate`.
- `onVisibleRangeChange(range, { view })` fires after mount and on change: load events for that range.
- `onDateActivate` is the only click behavior; the app decides what it means.

## Events

Pass `events` and render a cell's segments; Chrono computes the layout and you render the content.

```svelte
<Calendar {events} eventLimit="auto" onSelectRange={create}>
  <CalendarMonthGrid>
    {#snippet children(day)}
      <CalendarEvents {day}>
        {#snippet children(segments)}
          {#each segments as segment (segment.key)}<CalendarEvent {segment} />{/each}
        {/snippet}
      </CalendarEvents>
    {/snippet}
  </CalendarMonthGrid>
</Calendar>
```

- Parts: `CalendarEvents`, `CalendarEvent`, `CalendarMoreButton` ("+N more" calls `onMoreActivate`), `CalendarAllDayRow` (`{ days, segments }`), `CalendarNowIndicator`, `CalendarSelectionPreview`.
- `segment.event` is your original object. Positions are `--chrono-event-*` custom properties; you own the CSS.
- `bind:selectedEventId`, `onSelectedEventChange`, `onEventActivate`, `onMoreActivate`, `onSelectRange`.
- `selectable` turns on range creation; all-day ranges are exclusive on the end.

### Make events draggable

1. Turn on `<Calendar editable onEventChange={...}>`. Chrono only **proposes** `{ kind, event, from, to, source }`; it never changes `events`. Return `false` or a promise of `false` to reject; the event shows `data-pending` until your `events` hold the new times (or `pendingTimeout`).
2. Render `CalendarEventResizeHandle` (`segment`, `edge`) and `CalendarEventDragPreview` (`day`, optional `allDay`).
3. In the app's CSS give events and handles `touch-action: none` and style `[data-dragging]`, `[data-pending]`, `[data-invalid]` and `[data-drag-preview]`. Chrono ships no CSS.
4. Optional: `snapDuration`, `validateEventChange`, `allowAllDayConversion`, `scrollContainer`, `keyboardShortcuts` (`M`, `R`, `Shift+R`).

### Resources (room booking, staff timeline)

1. `import { resourceViews }` and pass `views={resourceViews}` (data, opt-in: apps without it do not ship resource code). Pass `resources` (flat, `parentId` for groups) and give events `resourceId` (one id or an array).
2. Room booking: `defaultView="resourceDay"`, render each column from `layout.columns` and `layout.pieces`. Staff timeline: `defaultView="timelineWeek"`, render `layout.rows`, header cells from `layout.axis.headerRows` and pieces by `rowKey`.
3. Collapse groups with `collapsedResourceIds` / `toggleResource`; zoom with `zoomLevels` and `zoomIn()` / `zoomOut()`; give your CSS the sizes from `--chrono-event-left`, `--chrono-event-width`, `--chrono-row-lanes`.
4. Not yet: dragging between resources and resource-aware selection.

## Date inputs and panels

`@zealakit/chrono-svelte/date` (also exported from the root) adds `DateInput`, `DateRangeInput`, `DatePanel`, `DateRangePanel` and `MultiDatePanel`. They are unstyled and have no popup: open, position and close your own popup around them.

```svelte
<script lang="ts">
import { DateInput, DatePanel } from "@zealakit/chrono-svelte/date";
let value = $state(null);
</script>

<DateInput bind:value name="when" />
<DatePanel bind:value autoFocus onValueCommit={() => close()} />
```

- `onValueChange` fires on every change (also a partial range); `onValueCommit` fires when a choice is complete. Close the popup on commit.
- `autoFocus` is off by default. Turn it on inside a popup. Escape is never stopped unless it cancelled a range draft.
- `name` renders a hidden input with the ISO value; a range uses `name-start` and `name-end`.
- `getPresetRange("last7Days", { today })` and `matchPreset` are pure helpers for preset buttons you render yourself.
- The foundation type `DateInput` is exported as `DateInputValue` because `DateInput` is a component.

## Time inputs and panels

`@zealakit/chrono-svelte/time` (also exported from the root) adds `TimeInput`, `TimeRangeInput`, `TimePanel` and `TimeRangePanel`. They hold a wall-clock time with no date and no time zone, and have no popup.

```svelte
<script lang="ts">
import { TimeInput, TimePanel } from "@zealakit/chrono-svelte/time";
let value = $state(null);
</script>

<TimeInput bind:value name="opens" />
<TimePanel bind:value layout="list" start="09:00" end="17:00" slotDuration={30} groupBy="dayPeriod" />
```

- `layout="columns"` (default for a panel) shows one listbox per part; `layout="list"` shows times every `step` or slots (`slotDuration` or an explicit `slots` array whose `data` is yours). A range panel defaults to the list.
- `onValueChange` fires on every change (also a partial range); `onValueCommit` when a choice is complete. Close your popup on commit. `autoFocus` is off by default; Escape is never stopped unless it cancelled a range draft.
- `granularity` (`hour`, `minute`, `second`), `hourCycle` (`h12`, `h23`), `step` and `allowOvernight` (`23:00`–`02:00`); ranges are half-open `[start, end)`. A typed value off the `step` is kept and reported as `off-step`.
- `name` renders a hidden input (`09:30`); a range uses `name-start` and `name-end`.
- `getBookingSlots`, `parseTime` and `snapTime` are pure helpers. The foundation type `TimeInput` is exported as `TimeInputValue`; the slot type is `BookingSlot`.

## DateTime inputs and panels

`@zealakit/chrono-svelte/datetime` (also exported from the root) adds `DateTimeInput`, `DateTimeRangeInput`, `DateTimePanel` and `DateTimeRangePanel`. They compose the Date and Time parts: import `DatePanelGrid`, `TimePanelColumn`... from `/date` and `/time` and put them inside `DateTimePanelDate` and `DateTimePanelTime`.

```svelte
<script lang="ts">
import { DateTimeInput, DateTimePanel } from "@zealakit/chrono-svelte/datetime";
let value = $state(null);
</script>

<DateTimeInput bind:value timeZone="Asia/Ho_Chi_Minh" valueTimeZone="UTC" name="at" />
<DateTimePanel bind:value timeZone="Asia/Ho_Chi_Minh" valueTimeZone="UTC" disablePast defaultTime="09:00" />
```

- The value is a `ZonedDateTime` with a `timeZone`, a `PlainDateTime` without one; never a string or a `Date`. `valueTimeZone` stores the same instant in another zone. A time in a daylight-saving gap keeps the typed wall time and sets `data-adjusted`; `disambiguation: "reject"` reports `nonexistent-time`.
- `min`, `max`, `disablePast`, `isTimeDisabled(time, date)` and `defaultTime` combine date and time limits. `onValueCommit` fires only when the time part commits (a range: when the end time commits). Close your popup on commit.
- `name` renders a hidden input (ISO with the offset for a zoned value); `formValue(value)` overrides it. Segmented mode is one group of parts; text mode is two labelled fields and a pasted date-time fills both.
- `DateTimeInputTimeZone` shows the display zone as text; picking a zone is your UI. `parseDateTime`, `resolveWall`, `getDayInstants` and `checkDateTimeRange` are pure helpers. The foundation type `DateTimeInput` is exported as `DateTimeInputValue`.

## Rules

- Chrono ships no CSS. Style `data-today`, `data-selected`, `data-outside-month`, `data-weekend`, `data-disabled`, `data-focused` and `data-slot-start` yourself.
- `useCalendar()` and `useMiniCalendar()` return a store plus prop getters for fully custom markup.
- SvelteKit: pass `now` and `locale` (and `timeZone`) from the server so the server and client render the same markup.
- Imports: `@zealakit/chrono-svelte` (root) and `@zealakit/chrono-svelte/calendar` give the same bindings.
- Do not add a popup, a global provider or CSS imports. Integrations (Overlay, Radix, Base UI) belong in your app.
