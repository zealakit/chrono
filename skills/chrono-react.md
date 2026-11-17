---
name: chrono-react
description: >-
  Use when adding @zealakit/chrono-react to a React 18/19 app: Calendar views, the Mini Calendar, controlled state, styling hooks and Server Components.
---

# Chrono for React

Use `@zealakit/chrono-react` for headless Calendar views and a Mini Calendar. The package owns date
logic, navigation, keyboard support and ARIA wiring. You own all CSS and visual markup. Release 0.3.0
adds events. Date inputs and panels exist (see below); Time and DateTime components do not exist yet; do not invent them.

`@zealakit/chrono-core` is an internal kernel bundled inside the adapter and not published to npm.
Never install it or import from it in application code.

## Install

```bash
npm install @zealakit/chrono-react
```

Peer dependencies: `react` and `react-dom` (^18 or ^19). Never install `@zealakit/chrono-core`; it is bundled.

## Compose

```tsx
import {
  Calendar, CalendarMonthGrid, CalendarNextButton, CalendarPrevButton, CalendarTitle,
} from "@zealakit/chrono-react";

<Calendar locale="en-US" weekStartsOn={1} onDateActivate={(date) => select(date)}>
  <CalendarPrevButton>Prev</CalendarPrevButton>
  <CalendarTitle />
  <CalendarNextButton>Next</CalendarNextButton>
  <CalendarMonthGrid className="month" />
</Calendar>
```

- Views: `CalendarMonthGrid` (month, multi-month), `CalendarTimeGrid` (week, work week, day, custom time grids), `CalendarAgenda`. Render all three; the inactive ones return nothing.
- `CalendarTimeGrid` and `CalendarAgenda` take a function child: `({ days, slots }) => ...` and `(days) => ...`. `CalendarMonthGrid` takes `(day) => ...` for cell content.
- Mini Calendar: `MiniCalendar` with `syncWith={{ date, visibleRange }}`, `isMarked`, `onNavigate`.
- Control `view` and `date` with props and `onViewChange` / `onDateChange`, or leave them uncontrolled.
- `onVisibleRangeChange(range, { view })` fires after mount and on change: load events for that range.
- `onDateActivate` is the only click behavior; the app decides what it means.

## Events

Pass `events` and render a cell's segments; Chrono computes the layout and you render the content.

```tsx
<Calendar events={events} eventLimit="auto" onSelectRange={create}>
  <CalendarMonthGrid>
    {(day) => (
      <CalendarEvents day={day}>
        {(segments) => segments.map((segment) => (
          <CalendarEvent key={segment.key} segment={segment} />
        ))}
      </CalendarEvents>
    )}
  </CalendarMonthGrid>
</Calendar>
```

- Parts: `CalendarEvents`, `CalendarEvent`, `CalendarMoreButton` ("+N more" fires `onMoreActivate`), `CalendarAllDayRow` (`{ days, segments }`), `CalendarNowIndicator`, `CalendarSelectionPreview`.
- `segment.event` is your original object. Positions are `--chrono-event-*` custom properties; you own the CSS.
- `selectable` turns on range creation; `onSelectRange(proposal)` carries a half-open range (all-day ends are exclusive).
- Event keys: `Enter`/`F2` enters a cell, `Space` selects, `Enter` activates, `Escape` returns to the day.

## Date inputs and panels

`@zealakit/chrono-react/date` (also exported from the root) adds `DateInput`, `DateRangeInput`, `DatePanel`, `DateRangePanel` and `MultiDatePanel`. They are unstyled and have no popup: open, position and close your own popup around them.

```tsx
import { useState } from "react";
import { DateInput, DatePanel } from "@zealakit/chrono-react/date";

function Field() {
  const [value, setValue] = useState(null);
  return (
    <>
      <DateInput value={value} onValueChange={setValue} name="when" />
      <DatePanel value={value} onValueChange={setValue} autoFocus onValueCommit={() => close()} />
    </>
  );
}
```

- `onValueChange` fires on every change (also a partial range); `onValueCommit` fires when a choice is complete. Close the popup on commit.
- `autoFocus` is off by default. Turn it on inside a popup. Escape is never stopped unless it cancelled a range draft.
- `name` renders a hidden input with the ISO value; a range uses `name-start` and `name-end`.
- `getPresetRange("last7Days", { today })` and `matchPreset` are pure helpers for preset buttons you render yourself.
- The foundation type `DateInput` is exported as `DateInputValue` because `DateInput` is a component.

## Rules

- Chrono ships no CSS. Style `data-today`, `data-selected`, `data-outside-month`, `data-weekend`, `data-disabled`, `data-focused` and `data-slot-start` yourself. `asChild` renders your own element.
- Components and hooks are client components. `getCalendarTitle`, `getRange`, `getVisibleRange`, `toPlainDate`, `toIsoString` and `isSameDay` have no directive and work in Server Components.
- Next.js: pass `now` and `locale` (and `timeZone`) from the server so the server and client render the same markup.
- Imports: `@zealakit/chrono-react` (root) and `@zealakit/chrono-react/calendar` give the same bindings.
- Do not add a popup, a global Provider or CSS imports. Integrations (Overlay, Radix, Base UI) belong in your app.
