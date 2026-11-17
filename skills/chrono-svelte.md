---
name: chrono-svelte
description: >-
  Use when adding @zealakit/chrono-svelte to a Svelte 5 app: Calendar views, the Mini Calendar, bound state, styling hooks and SvelteKit.
---

# Chrono for Svelte

Use `@zealakit/chrono-svelte` for headless Calendar views and a Mini Calendar. The package owns date
logic, navigation, keyboard support and ARIA wiring. You own all CSS and visual markup. Release 0.3.0
adds events. Date inputs and panels exist (see below); Time and DateTime components do not exist yet; do not invent them.

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

## Rules

- Chrono ships no CSS. Style `data-today`, `data-selected`, `data-outside-month`, `data-weekend`, `data-disabled`, `data-focused` and `data-slot-start` yourself.
- `useCalendar()` and `useMiniCalendar()` return a store plus prop getters for fully custom markup.
- SvelteKit: pass `now` and `locale` (and `timeZone`) from the server so the server and client render the same markup.
- Imports: `@zealakit/chrono-svelte` (root) and `@zealakit/chrono-svelte/calendar` give the same bindings.
- Do not add a popup, a global provider or CSS imports. Integrations (Overlay, Radix, Base UI) belong in your app.
