# @zealakit/chrono-svelte

[English](https://github.com/zealakit/chrono/blob/main/packages/svelte/README.md) | [Tiếng Việt](https://github.com/zealakit/chrono/blob/main/packages/svelte/README_VI.md) | [中文](https://github.com/zealakit/chrono/blob/main/packages/svelte/README_CN.md)

![Zealakit Chrono cover](https://github.com/zealakit/chrono/blob/main/assets/images/chrono-cover.jpg?raw=true)

Headless Calendar components for Svelte: month, week, work week, day, agenda, multi-month and custom views, navigation, and a Mini Calendar. You own visual styling.

Chrono ships no CSS and sets no visual styles. Parts render your own elements and classes; state is exposed as `data-*` and ARIA attributes, so your CSS owns every look.

Pre-1.0: the API may change between minor versions.

> **Note**
> Chrono is a focused, headless set of Calendar views and Date, Time and DateTime components. It ships no CSS and renders no styled markup, so you keep full control of the visuals. Release 0.3.0 adds events to the Calendar views: layout, selection, "+N more" overflow and a now-indicator. The new `/date` entry adds date inputs and panels; the `/time` entry adds time inputs and panels; the `/datetime` entry composes them.
>
> Chrono is not a full UI library or design system, and it ships no popup, overlay, or positioning code. Put its panels inside your own popup when you need one.

## Install

```bash
npm install @zealakit/chrono-svelte
```

Peer dependencies: `svelte` `^5.20.0`.

## Calendar

### Quick start

Create a calendar, then compose its parts. Every part is optional; render only what you need.

```svelte
<script lang="ts">
  import {
    Calendar,
    CalendarMonthGrid,
    CalendarNextButton,
    CalendarPrevButton,
    CalendarTitle,
  } from "@zealakit/chrono-svelte";
</script>

<Calendar locale="en-US" weekStartsOn={1}>
  <CalendarPrevButton>Prev</CalendarPrevButton>
  <CalendarTitle />
  <CalendarNextButton>Next</CalendarNextButton>
  <CalendarMonthGrid class="month" />
</Calendar>
```

### Import styles

Every domain is reachable from the root entry and from its own subpath. Both give the same bindings, so you can mix them freely.

```ts
// Domain subpath
import { Calendar, CalendarMonthGrid } from "@zealakit/chrono-svelte/calendar";

// Root entry: re-exports every domain, same bindings
import { Calendar, getCalendarTitle } from "@zealakit/chrono-svelte";
```

The root also re-exports the same utilities, so a Server Component or a server action can call them without loading any component code.

### Parts

| Part | Renders | Purpose |
| --- | --- | --- |
| `Calendar` | `div` | Creates the calendar. Takes the options below. |
| `CalendarTitle` | `h2` | The title text. It is announced politely when it changes. |
| `CalendarPrevButton`, `CalendarNextButton`, `CalendarTodayButton` | `button` | Navigation. The previous and next buttons get `aria-disabled` at `min` and `max`. |
| `CalendarViewButton` | `button` | Switches to its `view`. `aria-pressed` marks the active one. |
| `CalendarMonthGrid` | `table` | Weekday headers, optional week numbers and one cell per day. `month` picks the grid of a multi-month view. |
| `CalendarWeekdayHeader`, `CalendarWeekNumber`, `CalendarCell` | `th`, `th`, `td` | The pieces of a month grid. Use them to build your own grid. |
| `CalendarTimeGrid` | `div` | Day columns and time slots, with no events yet. |
| `CalendarTimeGridColumnHeader` | `div` | The focusable day header of a time grid. |
| `CalendarTimeGridSlot` | `div` | One slot of one day. It is not focusable yet. |
| `CalendarAgenda`, `CalendarAgendaDay` | `ul`, `li` | The agenda list and its days. |
| `MiniCalendar` | `div` | A month calendar, optionally synced with the main one. |
| `MiniCalendarTitle`, `MiniCalendarPrevButton`, `MiniCalendarNextButton` | `h2`, `button`, `button` | Title and paging of the Mini Calendar. |
| `MiniCalendarGrid`, `MiniCalendarWeekdayHeader`, `MiniCalendarCell` | `table`, `th`, `td` | The Mini Calendar grid and its pieces. |

### Calendar options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `view` | `string` | — | Controlled view id: `month`, `week`, `workWeek`, `day`, `agenda`, `multiMonth` or a custom one. |
| `defaultView` | `string` | `"month"` | Initial view when uncontrolled. |
| `date` | `DateInput` | — | Controlled date the range is built around. |
| `defaultDate` | `DateInput` | today | Initial date when uncontrolled. |
| `onViewChange` | `(view) => void` | — | The view changed. |
| `onDateChange` | `(date) => void` | — | The date the range is built around changed. |
| `onVisibleRangeChange` | `(range, { view }) => void` | — | Fires once after mount and whenever the visible range changes. Load events for this range. |
| `onDateActivate` | `(date, { view, source }) => void` | — | A day was clicked or Enter was pressed. Calendar does nothing else; you decide what it means. |
| `views` | `Record<string, ViewDefinition>` | — | Custom views, merged over the built-ins. |
| `locale` | `string` | runtime locale | BCP 47 tag. Pass it for server rendering. |
| `weekStartsOn` | `1`–`7` | locale | First weekday, 1 = Monday. |
| `hiddenDays` | `DayOfWeek[]` | `[]` | Hide weekdays in every layout. |
| `timeZone` | `string` | runtime zone | IANA zone used to decide which day is today. |
| `now` | `number` | `Date.now()` | Epoch milliseconds used as now. Pass it for server rendering. |
| `min`, `max` | `DateInput` | — | Limit navigation. Days outside are marked `data-disabled`. |
| `timeGrid` | `{ start, end, step, workingHours }` | 30-minute slots | Time axis of the time grid. `step` is in minutes; `workingHours` is `{ start, end, days }`. |
| `weekNumbers` | `"iso" \| "locale" \| false` | `false` | Show week numbers in month grids. |
| `messages` | `Partial<Messages>` | English | Accessible names and state words. Only English ships; pass your own to translate. |
| `selectedDate` | `DateInput` | — | Marks a day `data-selected`. Calendar never changes it; you set it, for example from `onDateActivate`. |
| `highlightedDates` | `DateInput[] \| (date) => boolean` | — | Marks days `data-highlighted`. |

### Views

A view is data: a layout, a length and an alignment. Add your own through `views`.

| View | Layout | Range |
| --- | --- | --- |
| `month` | month | One month with adjacent days, 6 rows. |
| `week` | time grid | One week. |
| `workWeek` | time grid | One week without the locale's weekend. |
| `day` | time grid | One day. |
| `agenda` | list | Seven days from the date. |
| `multiMonth` | month | Three months. |

```svelte
<Calendar
  views={{ threeDay: { layout: "time-grid", length: { days: 3 }, align: "day" } }}
  defaultView="threeDay"
/>
```

### Controlled usage

Leave `view` and `date` unset for uncontrolled use, or control them yourself. Calendar only reports changes and never persists anything.

```svelte
<script lang="ts">
  let view = $state("month");
  let date = $state(toPlainDate("2026-11-17"));
</script>

<Calendar bind:view {date} onDateChange={(next) => (date = next)} />
```

### Mini Calendar

The Mini Calendar has its own month. Pass `syncWith` and it follows the main calendar when the main date leaves its month; the user can still page it independently.

```svelte
<MiniCalendar
  syncWith={range ? { date, visibleRange: range } : undefined}
  isMarked={hasEvents}
  onNavigate={(next) => (date = next)}
>
  <MiniCalendarPrevButton />
  <MiniCalendarTitle />
  <MiniCalendarNextButton />
  <MiniCalendarGrid />
</MiniCalendar>
```

`MiniCalendar` takes `month` / `defaultMonth` / `onMonthChange`, `syncWith` (`{ date, visibleRange }` of the main calendar), `isMarked` (`(date) => boolean`, for example days with events), `onNavigate` (`(date) => void`) and the shared `locale`, `weekStartsOn`, `timeZone`, `now`, `min`, `max`, `weekNumbers`, `messages`, `selectedDate` and `highlightedDates`.

### Keyboard

| Key | Action |
| --- | --- |
| `←` `→` | Previous or next day. Swapped in right-to-left locales. |
| `↑` `↓` | Previous or next week in a month grid; previous or next day in the agenda. |
| `Home` `End` | Start or end of the week, or the first or last day of a time grid or agenda. |
| `PageUp` `PageDown` | Previous or next range (month, week, ...). In a month grid, `Shift` moves by a year. |
| `Enter` | Activates the focused day (`onDateActivate`). |

### Server rendering

Pass `now` and `locale` (and `timeZone`) so the server and the client render the same markup. Without them Chrono reads the runtime clock and locale, which differ between server and browser.

```svelte
<Calendar {now} locale="en-US" timeZone="UTC" />
```

## SvelteKit

Nothing touches the DOM during render. In SvelteKit, render the calendar as usual and pass `now` and `locale` from the server.

```ts
// Utilities have no browser dependency and run on the server.
import { getCalendarTitle, getRange } from "@zealakit/chrono-svelte/calendar";
```

## Events

Pass `events` and render each cell's segments with `CalendarEvents` and `CalendarEvent`; Chrono computes lanes, columns, overflow and continuation flags and you render the content. Pass `eventLimit="auto"` to measure the visible cell and listen to `onSelectRange` for drag-to-create.

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

| Part | Renders | Purpose |
| --- | --- | --- |
| `CalendarEvents` | `div` | The event list of one cell; its snippet receives that cell's segments. |
| `CalendarEvent` | `div` | One segment, with `segment.event` as your original object. |
| `CalendarMoreButton` | `button` | The "+N more" control; it calls `onMoreActivate`. |
| `CalendarAllDayRow` | `div` | The time-grid all-day row; its snippet receives `{ days, segments }`. |
| `CalendarNowIndicator` | `div` | The current-time line, rendered only when it is inside the axis. |
| `CalendarSelectionPreview` | `div` | One selection preview piece per covered day. |

Event positions are unitless numbers in `--chrono-event-*` custom properties, so your CSS owns the units and the layout method. `Enter` or `F2` enters a cell's events, `Space` selects, `Enter` activates and `Escape` returns to the day.

### Move and resize

Set `editable` to let people move and resize events. Chrono only **proposes** a change: `onEventChange(proposal)` receives `{ kind, event, from, to, source }` and your app decides. Return `false` (or a promise that resolves to `false`) to reject it; anything else accepts it, and the event stays in a `data-pending` state until your `events` contain the new times (or `pendingTimeout`, default 10 s, runs out). Chrono never changes `events` itself, persists, or syncs.

```svelte
<Calendar editable {events} onEventChange={(change) => save(change)}>
  <CalendarMonthGrid>
    {#snippet children(day)}
      <CalendarEvents {day}>
        {#snippet children(segments)}
          {#each segments as segment (segment.key)}
            <CalendarEvent {segment}>
              <CalendarEventResizeHandle {segment} edge="end" />
            </CalendarEvent>
          {/each}
        {/snippet}
      </CalendarEvents>
      <CalendarEventDragPreview {day} />
    {/snippet}
  </CalendarMonthGrid>
</Calendar>
```

| Option | Purpose |
| --- | --- |
| `editable`, `isEventEditable` | Turn editing on for the calendar or per event. An event can also set `editable`, `movable` or `resizable` to `false`. |
| `snapDuration`, `defaultTimedDuration` | Minutes to snap to (default: the slot duration) and the length of an all-day event dropped into the time grid (default 60). |
| `allowAllDayConversion` | Allow dragging between the all-day row and the time grid (default `true`). |
| `validateEventChange` | Return `false` to mark the target `data-invalid` and block the drop. |
| `autoScroll`, `scrollContainer` | Scroll the container while the pointer is near its edge. |
| `keyboardShortcuts` | `M` moves, `R` resizes the end, `Shift+R` the start; `false` turns them off. Arrows step, `Enter` drops, `Escape` cancels. |

`CalendarEventResizeHandle` renders a handle inside an event, and `CalendarEventDragPreview` renders one `aria-hidden` preview piece per covered cell while a drag runs. Chrono writes only `data-*` state and `--chrono-*` numbers: give events and handles `touch-action: none` in your CSS and style `[data-dragging]`, `[data-pending]` and `[data-invalid]` yourself. A drag needs a 4 px move (a touch needs a 400 ms hold), so a click still selects.

### Resources

Resource views are an **opt-in view pack**: import `resourceViews` and pass it as `views`, so apps without resources do not ship the code. Pass `resources` (a flat list; `parentId` makes a tree) and give events a `resourceId` (one id, or an array to show an event in several resources). Chrono lays out the columns, rows and events; your app owns the resources, permissions and rules.

```svelte
<Calendar views={resourceViews} defaultView="timelineWeek" resources={rooms} events={bookings}>
  <CalendarTimeline>
    {#snippet children(layout)}
      {#each layout.rows as row (row.key)}
        <CalendarTimelineRow {row}>
          <CalendarTimelineRowHeader {row} />
          {#each layout.pieces.filter((p) => p.rowKey === row.key) as piece (piece.key)}
            <CalendarResourceEvent {piece} />
          {/each}
        </CalendarTimelineRow>
      {/each}
    {/snippet}
  </CalendarTimeline>
</Calendar>
```

Collapse state is `bind:collapsedResourceIds`.

| View | Layout |
| --- | --- |
| `resourceDay`, `resourceWeek` | Columns are days × resources (`resourceGrouping`: `"resource-first"` or `"date-first"`), each laid out like a normal time-grid day. |
| `timelineDay`, `timelineWeek`, `timelineMonth` | One row per resource on a horizontal axis. A definition sets `slot` (`{ minutes }`, `{ days }` or `{ weeks }`) and `headerRows` (for example `["day", "hour"]`). |

Parts: `CalendarResourceGrid`, `CalendarResourceHeader`, `CalendarResourceGroupHeader`, `CalendarTimeline`, `CalendarTimelineHeaderCell`, `CalendarTimelineRow`, `CalendarTimelineRowHeader`, `CalendarTimelineCell` and `CalendarResourceEvent`.

Events carry `--chrono-event-left` and `--chrono-event-width` (fractions of the axis) in a timeline, and each row carries `--chrono-row-lanes`, so your CSS owns the sizes. Grouped resources use the `treegrid` pattern (`aria-level`, `aria-expanded`); `collapsedResourceIds` (or `toggleResource`) collapses a group. `zoomLevels` lists view ids from finest to coarsest for `zoomIn()` and `zoomOut()`. `resourceWindow` and `slotWindow` (half-open) lay out only a window and expose the full counts, so an app virtualizer can drive them; Chrono ships no virtualizer. Events without a `resourceId` are not shown in resource views. Not yet: dragging between resources, per-resource working hours, `scrollToTime` and treegrid arrow-key navigation.

## Date

Five independent, unstyled components: `DateInput`, `DatePanel`, `DateRangeInput`, `DateRangePanel` and `MultiDatePanel`. They work alone, together through a shared value, and inside any popup you choose. Chrono has no popup: opening, positioning and closing belong to your app.

### Date quick start

Share one value between a typed field and a panel. Typing moves the panel; picking a day fills the field.

```svelte
<script lang="ts">
import { DateInput, DatePanel } from "@zealakit/chrono-svelte/date";
import type { DateValue } from "@zealakit/chrono-svelte/date";

let value = $state<DateValue>(null);
</script>

<DateInput bind:value name="check-in" />
<DatePanel bind:value />
```

### Date parts

Every part is optional. A panel or input rendered without children draws a default layout; compose the parts for your own.

| Part | Default element | Notes |
| --- | --- | --- |
| `DateInput` | `div` | Group of segments, or a text field with `mode="text"` |
| `DateInputSegment, DateInputLiteral` | `span` | One part (spinbutton) and a separator |
| `DateInputTextField, DateInputClearButton` | `input, button` | Text mode field and clear |
| `DateRangeInput, DateRangeInputStart, DateRangeInputEnd` | `div` | Two fields in one group |
| `DatePanel, DateRangePanel, MultiDatePanel` | `div` | The three panel roots; range shows two months |
| `DatePanelTitle, DatePanelLevelButton` | `h2, button` | Title, and the title as a level switch |
| `DatePanelPrevButton, DatePanelNextButton, DatePanelTodayButton` | `button` | Paging and today |
| `DatePanelGrid, DatePanelWeekdayHeader, DatePanelWeekNumber, DatePanelCell` | `table, th, td` | The grid of the current level |

### Change and commit

`onValueChange` fires on every change, including a partial range. `onValueCommit` fires when a choice is complete: a day is picked, a range has both ends, or a typed value is valid on blur or Enter. Close your popup on commit. A multi selection never commits by itself; call `commit()`.

### Date keyboard

Arrow keys, Home/End and PageUp/PageDown move focus. Enter or Space picks (toggles in a multi panel; Shift+Enter adds the span from the last day). Ctrl or Cmd with ArrowUp goes up a level (day, month, year). Escape cancels a range draft and is otherwise left alone so your popup can close. In an input, digits type and advance, ArrowUp and ArrowDown step with wrap, Backspace clears a part and ArrowLeft and ArrowRight move between parts (swapped in right-to-left languages).

### Forms and validity

Set `name` and the root renders a hidden input with the ISO value (`2026-11-17`). A range uses `name-start` and `name-end` (or `startName` and `endName`); a multi panel is not a field. A form reset restores `defaultValue`. Invalid input keeps what was typed and reports `validity` (`empty`, `incomplete`, `invalid-date`, `before-min`, `after-max`, `disabled`, `unavailable`, `valid`) as `aria-invalid` and `data-invalid`; the error text is yours.

### Range presets

`getPresetRange(preset, { today, weekStartsOn, fiscalYearStartMonth })` returns the inclusive range of `today`, `yesterday`, `last7Days`, `last30Days`, `thisWeek`, `lastWeek`, `thisMonth`, `lastMonth`, `thisQuarter`, `lastQuarter`, `yearToDate`, `thisYear`, `lastYear` or a custom `{ unit, amount, align }`. `matchPreset` tells which preset equals the current value, for `aria-pressed` on your own buttons. Presets are pure helpers: the buttons are yours.

### Popup recipes

Put a panel in any popup library: set `autoFocus` so focus moves into the panel (it is off by default so an inline panel never steals focus), close on `onValueCommit` and let the popup restore focus. The panel never stops Escape unless it just cancelled a range draft. The foundation type `DateInput` is exported by the adapters as `DateInputValue`, because `DateInput` is now a component.

## Time

Four independent, unstyled components with no date and no time zone: `TimeInput`, `TimePanel`, `TimeRangeInput` and `TimeRangePanel`. They suit opening hours, working hours, daily schedules and appointment slots. Like the Date components they have no popup of their own.

### Time quick start

Share one value between a segmented field and a panel. Typing moves the panel; picking an option fills the field.

```svelte
<script lang="ts">
import { TimeInput, TimePanel } from "@zealakit/chrono-svelte/time";
import type { TimeValue } from "@zealakit/chrono-svelte/time";

let value = $state<TimeValue>(null);
</script>

<TimeInput bind:value name="opens" />
<TimePanel bind:value step={{ minutes: 15 }} />
```

### Time parts

Every part is optional. A panel rendered without children draws its default layout.

| Part | Default element | Notes |
| --- | --- | --- |
| `TimeInput` | `div` | Group of segments, or a text field with `mode="text"` |
| `TimeInputSegment, TimeInputLiteral` | `span` | One part (spinbutton) and a separator |
| `TimeInputTextField, TimeInputClearButton` | `input, button` | Text mode field and clear |
| `TimeRangeInput, TimeRangeInputStart, TimeRangeInputEnd` | `div` | Two fields in one group |
| `TimePanel, TimeRangePanel` | `div` | Both layouts; a range list is the default |
| `TimePanelColumn` | `div` | Columns layout: one listbox per part |
| `TimePanelList, TimePanelGroup, TimePanelGroupLabel` | `div` | List layout and its groups |
| `TimePanelOption` | `div` | One time or slot; custom content can read `slot.data` |
| `TimeRangePanelStart, TimeRangePanelEnd` | `div` | Columns layout of a range: one column set each |

### Layouts and slots

`layout="columns"` shows one listbox per part (hour, minute, second, day period). `layout="list"` shows one listbox of times every `step`, or of slots with `slotDuration` or an explicit `slots` array (`{ start, end?, available?, data? }`). A slot's `data` is yours: read it from the option content. `groupBy` accepts `"hour"`, `"dayPeriod"` (labels from `Intl`) or your own function. `granularity` is `hour`, `minute` or `second`, `hourCycle` is `h12` or `h23` (default from the locale) and `step` sets the minute or second interval. Hours or options that are not allowed stay focusable but cannot be picked.

### Overnight ranges

A time range is half-open `[start, end)`. With `allowOvernight`, an `end` before the `start` means the next day (`23:00` to `02:00`, `duration` 180 minutes, `crossesMidnight` true). `09:00` to `09:00` is always `end-before-start`. `minDuration` and `maxDuration` (minutes) mark the options that would break them with `data-range-blocked`. In a list, two picks make a range: with `slotDuration` the end is the end of the picked slot.

### Time keyboard

A panel is one tab stop. In columns, left and right arrows change column, up and down arrows move inside it, Home and End jump to the ends, PageUp and PageDown move by 3 hours or 15 minutes, digits type ahead (`1` then `5` focuses 15) and Enter or Space picks. In a list, up and down arrows, Home, End, PageUp and PageDown move and digits type ahead. Escape only cancels a range draft. In an input, digits type and advance, ArrowUp and ArrowDown step by `step` with wrap, and typing `a` or `p` (the first letters of the localized labels) sets the day period.

### Time forms and validity

Set `name` and the root renders a hidden input with `09:30` (`09:30:15` with `granularity="second"`); a range uses `name-start` and `name-end`. Typed values are never rewritten: one that is not on the `step` is kept and reported as `validity: "off-step"` (`snapTime` is there if you want to snap on blur). The other states are `empty`, `incomplete`, `before-min`, `after-max`, `disabled`, `unavailable`, `valid`, plus `end-before-start`, `too-short` and `too-long` for ranges. In text mode `9`, `930`, `9:30`, `9.30`, `9h30`, `21:30`, `9:30 pm` and `9 PM` all parse.

### Time popup recipes

Put a panel in any popup library like a Date panel: set `autoFocus` inside the popup, close on `onValueCommit` (the last column of the end set for a range in columns) and let the popup restore focus. The foundation type `TimeInput` is exported by the adapters as `TimeInputValue`, because `TimeInput` is now a component. `BookingSlot` is the slot type (the foundation `TimeSlot` is the Calendar's time-axis slot).

## DateTime

Four components that compose Date and Time: `DateTimeInput`, `DateTimePanel`, `DateTimeRangeInput` and `DateTimeRangePanel`. They reuse the Date and Time controllers and parts and add only what needs both: cross-part limits, time zones and daylight saving time. There is no popup and no time-zone picker; choosing a zone is your UI.

### DateTime quick start

A field and a panel share one value. Time zones make the value a `ZonedDateTime`; without one it is a plain wall-clock `PlainDateTime`.

```svelte
<script lang="ts">
import { DateTimeInput, DateTimePanel } from "@zealakit/chrono-svelte/datetime";
import type { DateTimeValue } from "@zealakit/chrono-svelte/datetime";

let value = $state<DateTimeValue>(null);
</script>

<DateTimeInput bind:value timeZone="Asia/Ho_Chi_Minh" valueTimeZone="UTC" name="at" />
<DateTimePanel bind:value timeZone="Asia/Ho_Chi_Minh" valueTimeZone="UTC" disablePast defaultTime="09:00" />
```

### DateTime parts

The containers provide the Date and Time contexts; the grid, cells, columns and options inside are the parts you import from `/date` and `/time`. A bare `DateTimePanel` draws a default layout.

| Part | Default element | Notes |
| --- | --- | --- |
| `DateTimeInput` | `div` | One segment group, or a date field and a time field |
| `DateTimeInputSegment, DateTimeInputLiteral, DateTimeInputClearButton` | `span, span, button` | Any date or time part, and clear |
| `DateTimeInputDateField, DateTimeInputTimeField` | `input, input` | Text mode: the two fields |
| `DateTimeInputTimeZone` | `span` | The display zone as text |
| `DateTimeRangeInput, DateTimeRangeInputStart, DateTimeRangeInputEnd` | `div` | Two fields in one group |
| `DateTimePanel, DateTimePanelDate, DateTimePanelTime` | `div` | Container and the two contexts |
| `DateTimeRangePanel, DateTimeRangePanelDate` | `div` | Container and the date range context |
| `DateTimeRangePanelStartTime, DateTimeRangePanelEndTime` | `div` | The two time contexts of a range |

### Time zones and daylight saving time

`timeZone` is the zone the user sees and edits. `valueTimeZone` (for example `"UTC"`) is the zone of the emitted value: the same instant, stored your way. `disambiguation` (`compatible`, `earlier`, `later`, `reject`) decides a wall time that falls in a daylight-saving gap or overlap. A time in a gap keeps the typed wall time on screen and sets `data-adjusted`; with `reject` the state is `nonexistent-time`. `getDayInstants` lists the real instants of a day (a repeated hour appears twice with its offset), and `resolveWall` shows how one wall time resolves.

### Limits, default time and commit

`min` and `max` accept date-times: days outside them are disabled and, on the boundary day, the times before `min` or after `max`. `disablePast` makes `min` now in `timeZone` (`now` is injectable). `isTimeDisabled(time, date)` gets the chosen date. `defaultTime` fills the time when a date is picked first, so the value is complete at once. Picking a new date keeps the time; if it becomes disabled the value goes `null` and the option is marked. `onValueCommit` fires when the time part commits, never when a date is picked. A range commits when the end time commits; `minDuration` and `maxDuration` (minutes) disable end times that would break them.

### DateTime forms and text mode

Set `name` and the root renders a hidden input: an ISO value with the offset for a zoned value (`2026-11-17T09:30:00+07:00`), otherwise `2026-11-17T09:30`. `formValue(value)` replaces it (for example to send UTC). A range uses `name-start` and `name-end`. In segmented mode the date and time parts are one tab stop; in text mode there are two labelled native fields, each parsed on its own, and pasting a full date-time such as `2026-11-17T09:30` or `17/11/2026 9:30` fills both.

### Which component do I need?

Pick the smallest component that holds your value. `DateTimeInputValue` is the foundation type `DateTimeInput` (a component has that name now).

| I need | Use |
| --- | --- |
| A day | `DateInput`, `DatePanel` (`/date`) |
| A range of days or many days | `DateRangeInput`, `DateRangePanel`, `MultiDatePanel` (`/date`) |
| A time of day or a slot | `TimeInput`, `TimePanel` (`/time`) |
| Opening hours or a shift | `TimeRangeInput`, `TimeRangePanel` (`/time`) |
| A moment, with a time zone | `DateTimeInput`, `DateTimePanel` (`/datetime`) |
| A booking from a moment to a moment | `DateTimeRangeInput`, `DateTimeRangePanel` (`/datetime`) |
| Views of days with events | `Calendar`, `MiniCalendar` (`/calendar`) |

## Styling hooks

| Attribute | Where | Purpose |
| --- | --- | --- |
| `data-chrono-calendar` | root | Marks the calendar root. `data-view` and `data-layout` carry the active view and layout. |
| `data-today` | cells, headers | The day is today. `aria-current="date"` is set too. |
| `data-selected`, `data-highlighted` | cells, headers | Set from `selectedDate` and `highlightedDates`. |
| `data-outside-month`, `data-weekend`, `data-hidden` | cells | The day is outside the shown month, on a weekend, or hidden through `hiddenDays`. |
| `data-focused` | cells, headers | The roving-tabindex day. Style `:focus-visible` for the keyboard ring. |
| `data-disabled` | cells, nav buttons | Outside `min` and `max`, or navigation cannot go further. `aria-disabled` is set too. |
| `data-marked`, `data-in-range` | Mini Calendar cells | From `isMarked`, and inside the synced visible range. |
| `data-slot-start`, `data-working-hours` | time grid slots | The slot start time, and whether it is inside the working hours. |
| `data-chrono-key` | cells, headers | The ISO date of the cell. Useful for tests and delegated listeners. |

## Agent Skill

The [Chrono Svelte skill](https://github.com/zealakit/chrono/blob/main/skills/chrono-svelte.md) covers integration steps for agents.

## License

MIT © Zealakit
