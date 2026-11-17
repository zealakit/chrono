---
name: chrono-vue
description: >-
  Use when adding @zealakit/chrono-vue to a Vue 3.5+ app: Calendar views, the Mini Calendar, v-model state, styling hooks and Nuxt.
---

# Chrono for Vue

Use `@zealakit/chrono-vue` for headless Calendar views and a Mini Calendar. The package owns date
logic, navigation, keyboard support and ARIA wiring. You own all CSS and visual markup. Release 0.3.0
adds events. Date and Time inputs and panels exist (see below); DateTime components exist too (see below); do not invent others.

`@zealakit/chrono-core` is an internal kernel bundled inside the adapter and not published to npm.
Never install it or import from it in application code.

## Install

```bash
npm install @zealakit/chrono-vue
```

Peer dependency: `vue` (^3.5). Never install `@zealakit/chrono-core`; it is bundled.

## Compose

```vue
<script setup lang="ts">
import { Calendar, CalendarMonthGrid, CalendarNextButton, CalendarPrevButton, CalendarTitle } from "@zealakit/chrono-vue";
const view = ref("month");
const date = ref(toPlainDate("2026-11-17"));
</script>

<template>
  <Calendar v-model:view="view" v-model:date="date" locale="en-US" :week-starts-on="1" @date-activate="select">
    <CalendarPrevButton>Prev</CalendarPrevButton>
    <CalendarTitle />
    <CalendarNextButton>Next</CalendarNextButton>
    <CalendarMonthGrid class="month" />
  </Calendar>
</template>
```

- Views: `CalendarMonthGrid`, `CalendarTimeGrid` and `CalendarAgenda`. Render all three; the inactive ones render nothing.
- Scoped slots: `CalendarTimeGrid` gives `{ days, slots }`, `CalendarAgenda` gives `{ days }`, `CalendarMonthGrid` gives `{ day }` for cell content.
- Mini Calendar: `MiniCalendar` with `:sync-with="{ date, visibleRange }"`, `:is-marked`, `@navigate`.
- `@visible-range-change` fires after mount and on change: load events for that range.
- `@date-activate` is the only click behavior; the app decides what it means.

## Events

Pass `events` and render a cell's segments; Chrono computes the layout and you render the content.

```vue
<Calendar :events="events" event-limit="auto" @select-range="create">
  <CalendarMonthGrid>
    <template #default="{ day }">
      <CalendarEvents :day="day">
        <template #default="{ segments }">
          <CalendarEvent v-for="segment in segments" :key="segment.key" :segment="segment" />
        </template>
      </CalendarEvents>
    </template>
  </CalendarMonthGrid>
</Calendar>
```

- Parts: `CalendarEvents`, `CalendarEvent`, `CalendarMoreButton` ("+N more" emits `moreActivate`), `CalendarAllDayRow` (`{ days, segments }`), `CalendarNowIndicator`, `CalendarSelectionPreview`.
- `segment.event` is your original object. Positions are `--chrono-event-*` custom properties; you own the CSS.
- `v-model:selected-event-id` plus `selectedEventChange`; `eventActivate`, `moreActivate`, `selectRange`.
- `selectable` turns on range creation; all-day ranges are exclusive on the end.

## Date inputs and panels

`@zealakit/chrono-vue/date` (also exported from the root) adds `DateInput`, `DateRangeInput`, `DatePanel`, `DateRangePanel` and `MultiDatePanel`. They are unstyled and have no popup: open, position and close your own popup around them.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { DateInput, DatePanel } from "@zealakit/chrono-vue/date";
const value = ref(null);
</script>

<template>
  <DateInput v-model:value="value" name="when" />
  <DatePanel v-model:value="value" auto-focus @value-commit="close" />
</template>
```

- `update:value` fires on every change (also a partial range); `valueCommit` fires when a choice is complete. Close the popup on commit.
- `autoFocus` is off by default. Turn it on inside a popup. Escape is never stopped unless it cancelled a range draft.
- `name` renders a hidden input with the ISO value; a range uses `name-start` and `name-end`.
- `getPresetRange("last7Days", { today })` and `matchPreset` are pure helpers for preset buttons you render yourself.
- The foundation type `DateInput` is exported as `DateInputValue` because `DateInput` is a component.

## Time inputs and panels

`@zealakit/chrono-vue/time` (also exported from the root) adds `TimeInput`, `TimeRangeInput`, `TimePanel` and `TimeRangePanel`. They hold a wall-clock time with no date and no time zone, and have no popup.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { TimeInput, TimePanel } from "@zealakit/chrono-vue/time";
const value = ref(null);
</script>

<template>
  <TimeInput v-model:value="value" name="opens" />
  <TimePanel v-model:value="value" layout="list" start="09:00" end="17:00" :slot-duration="30" group-by="dayPeriod" />
</template>
```

- `layout="columns"` (default for a panel) shows one listbox per part; `layout="list"` shows times every `step` or slots (`slotDuration` or an explicit `slots` array whose `data` is yours). A range panel defaults to the list.
- `onValueChange` fires on every change (also a partial range); `onValueCommit` when a choice is complete. Close your popup on commit. `autoFocus` is off by default; Escape is never stopped unless it cancelled a range draft.
- `granularity` (`hour`, `minute`, `second`), `hourCycle` (`h12`, `h23`), `step` and `allowOvernight` (`23:00`–`02:00`); ranges are half-open `[start, end)`. A typed value off the `step` is kept and reported as `off-step`.
- `name` renders a hidden input (`09:30`); a range uses `name-start` and `name-end`.
- `getBookingSlots`, `parseTime` and `snapTime` are pure helpers. The foundation type `TimeInput` is exported as `TimeInputValue`; the slot type is `BookingSlot`.

## DateTime inputs and panels

`@zealakit/chrono-vue/datetime` (also exported from the root) adds `DateTimeInput`, `DateTimeRangeInput`, `DateTimePanel` and `DateTimeRangePanel`. They compose the Date and Time parts: import `DatePanelGrid`, `TimePanelColumn`... from `/date` and `/time` and put them inside `DateTimePanelDate` and `DateTimePanelTime`.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { DateTimeInput, DateTimePanel } from "@zealakit/chrono-vue/datetime";
const value = ref(null);
</script>

<template>
  <DateTimeInput v-model:value="value" time-zone="Asia/Ho_Chi_Minh" value-time-zone="UTC" name="at" />
  <DateTimePanel v-model:value="value" time-zone="Asia/Ho_Chi_Minh" value-time-zone="UTC" disable-past default-time="09:00" />
</template>
```

- The value is a `ZonedDateTime` with a `timeZone`, a `PlainDateTime` without one; never a string or a `Date`. `valueTimeZone` stores the same instant in another zone. A time in a daylight-saving gap keeps the typed wall time and sets `data-adjusted`; `disambiguation: "reject"` reports `nonexistent-time`.
- `min`, `max`, `disablePast`, `isTimeDisabled(time, date)` and `defaultTime` combine date and time limits. `onValueCommit` fires only when the time part commits (a range: when the end time commits). Close your popup on commit.
- `name` renders a hidden input (ISO with the offset for a zoned value); `formValue(value)` overrides it. Segmented mode is one group of parts; text mode is two labelled fields and a pasted date-time fills both.
- `DateTimeInputTimeZone` shows the display zone as text; picking a zone is your UI. `parseDateTime`, `resolveWall`, `getDayInstants` and `checkDateTimeRange` are pure helpers. The foundation type `DateTimeInput` is exported as `DateTimeInputValue`.

## Rules

- Chrono ships no CSS. Style `data-today`, `data-selected`, `data-outside-month`, `data-weekend`, `data-disabled`, `data-focused` and `data-slot-start` yourself.
- Parts keep your `class` and listeners; Chrono wins on ARIA and `data-*` attributes.
- Nuxt: pass `now` and `locale` (and `timeZone`) from the server so the server and client render the same markup.
- Imports: `@zealakit/chrono-vue` (root) and `@zealakit/chrono-vue/calendar` give the same bindings.
- Do not add a popup, a global provider or CSS imports. Integrations (Overlay, Radix, Base UI) belong in your app.
