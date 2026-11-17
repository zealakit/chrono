---
name: chrono-vue
description: >-
  Use when adding @zealakit/chrono-vue to a Vue 3.5+ app: Calendar views, the Mini Calendar, v-model state, styling hooks and Nuxt.
---

# Chrono for Vue

Use `@zealakit/chrono-vue` for headless Calendar views and a Mini Calendar. The package owns date
logic, navigation, keyboard support and ARIA wiring. You own all CSS and visual markup. Release 0.2.0
has no events, and no Date, Time or DateTime components yet; do not invent them.

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

## Rules

- Chrono ships no CSS. Style `data-today`, `data-selected`, `data-outside-month`, `data-weekend`, `data-disabled`, `data-focused` and `data-slot-start` yourself.
- Parts keep your `class` and listeners; Chrono wins on ARIA and `data-*` attributes.
- Nuxt: pass `now` and `locale` (and `timeZone`) from the server so the server and client render the same markup.
- Imports: `@zealakit/chrono-vue` (root) and `@zealakit/chrono-vue/calendar` give the same bindings.
- Do not add a popup, a global provider or CSS imports. Integrations (Overlay, Radix, Base UI) belong in your app.
