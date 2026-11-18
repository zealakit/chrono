# @zealakit/chrono-vanilla

[English](https://github.com/zealakit/chrono/blob/main/packages/vanilla/README.md) | [Tiếng Việt](https://github.com/zealakit/chrono/blob/main/packages/vanilla/README_VI.md) | [中文](https://github.com/zealakit/chrono/blob/main/packages/vanilla/README_CN.md)

![Zealakit Chrono cover](https://github.com/zealakit/chrono/blob/main/assets/images/chrono-cover.jpg?raw=true)

Headless Calendar controllers for plain DOM: month, week, work week, day, agenda, multi-month and custom views, navigation, and a Mini Calendar. You render the markup and own visual styling.

Chrono ships no CSS and sets no visual styles. Parts render your own elements and classes; state is exposed as `data-*` and ARIA attributes, so your CSS owns every look.

Pre-1.0: the API may change between minor versions.

> **Note**
> Chrono is a focused, headless set of Calendar views and Date, Time and DateTime components. It ships no CSS and renders no styled markup, so you keep full control of the visuals. Release 0.3.0 adds events to the Calendar views: layout, selection, "+N more" overflow and a now-indicator. The new `/date` entry adds date inputs and panels; the `/time` entry adds time inputs and panels; the `/datetime` entry composes them.
>
> Chrono is not a full UI library or design system, and it ships no popup, overlay, or positioning code. Put its panels inside your own popup when you need one.

## Install

```bash
npm install @zealakit/chrono-vanilla
```

No peer dependencies.

## Public API

| Export | Purpose |
| --- | --- |
| `createCalendar(root, options)` | Delegated listeners and a controller for the main calendar. Returns `controller`, `getState`, `subscribe`, `setOptions`, `syncFocus` and `destroy`. |
| `createMiniCalendar(root, options)` | The same for the Mini Calendar. |
| `applyAttributes(element, attributes)` | Stamps a controller attribute record onto an element and removes stale attributes. |
| `getCalendarTitle`, `getRange`, `getVisibleRange` | Pure utilities for the title and ranges of a view. |
| `toPlainDate`, `toIsoString`, `isSameDay` | Value helpers re-exported from core. |

The `controller` has the same state and attribute getters as the other adapters. Their records are described under Styling hooks.

## Markup

You write the markup. Stamp each record from `calendar.controller` with `applyAttributes` and give action buttons a `data-chrono-action` attribute; the delegated listeners do the rest.

## Usage

### Quick start

Create a calendar, then compose its parts. Every part is optional; render only what you need.

```ts
import { applyAttributes, createCalendar } from "@zealakit/chrono-vanilla";

const root = document.getElementById("calendar") as HTMLElement;
const calendar = createCalendar(root, { locale: "en-US", weekStartsOn: 1 });

function render() {
  const { controller } = calendar;
  const state = calendar.getState();
  applyAttributes(root, controller.getRootAttributes());
  // Build the markup with any templating, then stamp the records:
  //   applyAttributes(titleEl, controller.getTitleAttributes());
  //   applyAttributes(cellEl, controller.getCellAttributes(day));
  root.replaceChildren(/* ... */);
  calendar.syncFocus();
}

calendar.subscribe(render);
render();
```

### Import styles

Every domain is reachable from the root entry and from its own subpath. Both give the same bindings, so you can mix them freely.

```ts
// Domain subpath
import { applyAttributes, createCalendar } from "@zealakit/chrono-vanilla/calendar";

// Root entry: re-exports every domain, same bindings
import { createCalendar, getCalendarTitle } from "@zealakit/chrono-vanilla";
```

The root also re-exports the same utilities, so a Server Component or a server action can call them without loading any component code.

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

```ts
createCalendar(root, {
  views: { threeDay: { layout: "time-grid", length: { days: 3 }, align: "day" } },
  defaultView: "threeDay",
});
```

### Controlled usage

Leave `view` and `date` unset for uncontrolled use, or control them yourself. Calendar only reports changes and never persists anything.

```ts
const calendar = createCalendar(root, { view: "month", date: "2026-11-17" });
// You own the value: report it with onViewChange / onDateChange, apply it with setOptions.
calendar.setOptions({ view: "week" });
```

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

### Mini Calendar

The Mini Calendar has its own month. Pass `syncWith` and it follows the main calendar when the main date leaves its month; the user can still page it independently.

```ts
const mini = createMiniCalendar(miniRoot, {
  isMarked: (day) => hasEvents(day),
  onNavigate: (day) => calendar.controller.goTo(day),
});
calendar.subscribe((state) => mini.setOptions({ syncWith: { date: state.date, visibleRange: state.visibleRange } }));
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

```ts
createCalendar(root, { now, locale: "en-US", timeZone: "UTC" });
```

## Lifecycle

`createCalendar` adds delegated `click`, `keydown` and `keyup` listeners on `root`. Call `syncFocus()` after every render so the roving `tabindex` and keyboard focus survive re-rendering, and `destroy()` to remove the listeners.

## Events

Pass `events` to `createCalendar`, render a cell's segments from `getCellEventSegments(day)`, and stamp each one with `getEventAttributes(segment)`. Chrono computes lanes, columns, overflow and continuation flags; your template owns the markup. Listeners are delegated: clicks on `[data-chrono-event-key]` select, double-click activates, and `[data-overflow]` fires `onMoreActivate`.

```ts
for (const segment of calendar.controller.getCellEventSegments(day)) {
  const element = document.createElement("div");
  applyAttributes(element, calendar.controller.getEventAttributes(segment));
  cell.append(element);
}
```

| Method | Returns | Purpose |
| --- | --- | --- |
| `getCellEventSegments(day)` | segments | The segments hosted by one day cell. |
| `getEventAttributes(segment)` | attributes | Event attributes and `--chrono-event-*` positions. |
| `getMoreAttributes(day)` | attributes | The "+N more" button; `activateMore(day.key)` fires it. |
| `getAllDayCellAttributes(day)` | attributes | The all-day cell of a day. |
| `getSelectionPreviewAttributes(day)` | attributes | A selection preview piece for one day. |
| `getNowIndicatorAttributes()` | attributes | The current-time line, empty when out of view. |

Event positions are unitless numbers in `--chrono-event-*` custom properties, so your CSS owns the units and the layout method. `applyAttributes` writes them to the element's `style`. Range creation starts on the calendar root while `selectable` is set.

### Move and resize

Set `editable` to let people move and resize events. Chrono only **proposes** a change: `onEventChange(proposal)` receives `{ kind, event, from, to, source }` and your app decides. Return `false` (or a promise that resolves to `false`) to reject it; anything else accepts it, and the event stays in a `data-pending` state until your `events` contain the new times (or `pendingTimeout`, default 10 s, runs out). Chrono never changes `events` itself, persists, or syncs.

```ts
const calendar = createCalendar(root, {
  editable: true,
  events,
  onEventChange: (change) => save(change),
});
// Per cell, next to the event segments:
const { controller } = calendar;
for (const segment of controller.getCellEventSegments(day)) {
  const element = document.createElement("div");
  applyAttributes(element, controller.getEventAttributes(segment));
  const handle = document.createElement("div");
  applyAttributes(handle, controller.getResizeHandleAttributes(segment, "end"));
  element.append(handle);
}
for (const piece of controller.getCellDragPreviewSegments(day)) {
  const ghost = document.createElement("div");
  applyAttributes(ghost, controller.getDragPreviewAttributes(piece));
}
```

Re-render from `calendar.subscribe`; the pointer and keyboard handling is already wired on `root`.

| Option | Purpose |
| --- | --- |
| `editable`, `isEventEditable` | Turn editing on for the calendar or per event. An event can also set `editable`, `movable` or `resizable` to `false`. |
| `snapDuration`, `defaultTimedDuration` | Minutes to snap to (default: the slot duration) and the length of an all-day event dropped into the time grid (default 60). |
| `allowAllDayConversion` | Allow dragging between the all-day row and the time grid (default `true`). |
| `validateEventChange` | Return `false` to mark the target `data-invalid` and block the drop. |
| `autoScroll`, `scrollContainer` | Scroll the container while the pointer is near its edge. |
| `keyboardShortcuts` | `M` moves, `R` resizes the end, `Shift+R` the start; `false` turns them off. Arrows step, `Enter` drops, `Escape` cancels. |

`getResizeHandleAttributes` stamps a handle inside an event, and `getCellDragPreviewSegments` yields one `aria-hidden` preview piece per covered cell while a drag runs. Chrono writes only `data-*` state and `--chrono-*` numbers: give events and handles `touch-action: none` in your CSS and style `[data-dragging]`, `[data-pending]` and `[data-invalid]` yourself. A drag needs a 4 px move (a touch needs a 400 ms hold), so a click still selects.

### Resources

Resource views are an **opt-in view pack**: import `resourceViews` and pass it as `views`, so apps without resources do not ship the code. Pass `resources` (a flat list; `parentId` makes a tree) and give events a `resourceId` (one id, or an array to show an event in several resources). Chrono lays out the columns, rows and events; your app owns the resources, permissions and rules.

```ts
import { applyAttributes, createCalendar, resourceViews } from "@zealakit/chrono-vanilla/calendar";

const calendar = createCalendar(root, { views: resourceViews, defaultView: "timelineWeek", resources: rooms, events: bookings });
const { controller } = calendar;
const layout = calendar.getState().resources; // { kind: "timeline", axis, rows, pieces, window }
for (const row of layout.rows) {
  const element = document.createElement("div");
  applyAttributes(element, controller.getTimelineRowAttributes(row));
  // header: getTimelineRowHeaderAttributes(row); pieces: getResourcePieceAttributes(piece)
}
```

A click on a group row header (`[role=rowheader][data-resource-group]`) toggles it through the delegated listener.

| View | Layout |
| --- | --- |
| `resourceDay`, `resourceWeek` | Columns are days × resources (`resourceGrouping`: `"resource-first"` or `"date-first"`), each laid out like a normal time-grid day. |
| `timelineDay`, `timelineWeek`, `timelineMonth` | One row per resource on a horizontal axis. A definition sets `slot` (`{ minutes }`, `{ days }` or `{ weeks }`) and `headerRows` (for example `["day", "hour"]`). |

Getters: `getResourceHeaderAttributes`, `getResourceGroupHeaderAttributes`, `getTimelineAttributes`, `getTimelineHeaderCellAttributes`, `getTimelineRowAttributes`, `getTimelineRowHeaderAttributes`, `getTimelineCellAttributes` and `getResourcePieceAttributes`.

Events carry `--chrono-event-left` and `--chrono-event-width` (fractions of the axis) in a timeline, and each row carries `--chrono-row-lanes`, so your CSS owns the sizes. Grouped resources use the `treegrid` pattern (`aria-level`, `aria-expanded`); `collapsedResourceIds` (or `toggleResource`) collapses a group. `zoomLevels` lists view ids from finest to coarsest for `zoomIn()` and `zoomOut()`. `resourceWindow` and `slotWindow` (half-open) lay out only a window and expose the full counts, so an app virtualizer can drive them; Chrono ships no virtualizer. Events without a `resourceId` are not shown in resource views. Not yet: dragging between resources, per-resource working hours, `scrollToTime` and treegrid arrow-key navigation.

## Date

Five independent, unstyled components: `DateInput`, `DatePanel`, `DateRangeInput`, `DateRangePanel` and `MultiDatePanel`. They work alone, together through a shared value, and inside any popup you choose. Chrono has no popup: opening, positioning and closing belong to your app.

### Date quick start

Share one value between a typed field and a panel. Typing moves the panel; picking a day fills the field.

```html
<div id="check-in" data-chrono-date-input data-name="check-in"></div>
<div data-chrono-date-panel data-chrono-for="check-in"></div>

<script type="module">
  import { initDateElements } from "@zealakit/chrono-vanilla/date";

  const stop = initDateElements(document);
  document.addEventListener("chrono:valuecommit", (event) => {
    console.log(event.detail.value); // "2026-11-17"
  });
</script>
```

### API

Every part is optional. A panel or input rendered without children draws a default layout; compose the parts for your own.

| API | Purpose | Notes |
| --- | --- | --- |
| `initDateElements(root)` | Declarative setup | Reads `data-*` options, renders unstyled markup, returns a cleanup |
| `createDateInput`, `createDateRangeInput` | Controller-only fields | Delegated listeners; you render and call `applyAttributes` |
| `createDatePanel`, `createDateRangePanel`, `createMultiDatePanel` | Controller-only panels | Click, key and hover on `[data-chrono-key]`; `syncFocus()` after render |

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

```html
<div id="opens" data-chrono-time-input data-name="opens"></div>
<div data-chrono-time-panel data-chrono-for="opens" data-step="15"></div>

<script type="module">
  import { initTimeElements } from "@zealakit/chrono-vanilla/time";

  const stop = initTimeElements(document);
  document.addEventListener("chrono:valuecommit", (event) => {
    console.log(event.detail.value); // "21:30"
  });
</script>
```

### Time API

Every part is optional. A panel rendered without children draws its default layout.

| API | Purpose | Notes |
| --- | --- | --- |
| `initTimeElements(root)` | Declarative setup | Reads `data-*` options, renders unstyled markup, returns a cleanup |
| `createTimeInput`, `createTimeRangeInput` | Controller-only fields | Delegated listeners; you render and call `applyAttributes` |
| `createTimePanel`, `createTimeRangePanel` | Controller-only panels | Click, key and hover on `[role="option"]`; `syncFocus()` after render |

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

```html
<div id="at" data-chrono-datetime-input data-time-zone="Asia/Ho_Chi_Minh" data-name="at"></div>
<div data-chrono-datetime-panel data-chrono-for="at" data-time-zone="Asia/Ho_Chi_Minh" data-disable-past data-default-time="09:00"></div>

<script type="module">
  import { initDateTimeElements } from "@zealakit/chrono-vanilla/datetime";

  const stop = initDateTimeElements(document);
  document.addEventListener("chrono:valuecommit", (event) => {
    console.log(event.detail.value); // "2026-11-17T09:30:00+07:00[Asia/Ho_Chi_Minh]"
  });
</script>
```

### DateTime API

The containers provide the Date and Time contexts; the grid, cells, columns and options inside are the parts you import from `/date` and `/time`. A bare `DateTimePanel` draws a default layout.

| API | Purpose | Notes |
| --- | --- | --- |
| `initDateTimeElements(root)` | Declarative setup | Reads `data-*` options, renders the date and time markup, returns a cleanup |
| `createDateTimeInput`, `createDateTimeRangeInput` | Controller-only fields | Delegated listeners; you render and call `applyAttributes` |
| `createDateTimePanel`, `createDateTimeRangePanel` | Controller-only panels | Date and time hosts: `[data-chrono-datetime-date]`, `[data-chrono-datetime-time]` |

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

The [Chrono Vanilla skill](https://github.com/zealakit/chrono/blob/main/skills/chrono-vanilla.md) covers integration steps for agents.

## License

MIT © Zealakit
