# @zealakit/chrono-vanilla

[English](https://github.com/zealakit/chrono/blob/main/packages/vanilla/README.md) | [Tiếng Việt](https://github.com/zealakit/chrono/blob/main/packages/vanilla/README_VI.md) | [中文](https://github.com/zealakit/chrono/blob/main/packages/vanilla/README_CN.md)

![Zealakit Chrono cover](https://github.com/zealakit/chrono/blob/main/assets/images/chrono-cover.jpg?raw=true)

Headless Calendar controllers for plain DOM: month, week, work week, day, agenda, multi-month and custom views, navigation, and a Mini Calendar. You render the markup and own visual styling.

Chrono ships no CSS and sets no visual styles. Parts render your own elements and classes; state is exposed as `data-*` and ARIA attributes, so your CSS owns every look.

Pre-1.0: the API may change between minor versions.

> **Note**
> Chrono is a focused, headless set of Calendar views and, in later releases, Date, Time and DateTime components. It ships no CSS and renders no styled markup, so you keep full control of the visuals. Release 0.3.0 adds events to the Calendar views: layout, selection, "+N more" overflow and a now-indicator. The new `/date` entry adds date inputs and panels; the `/time` entry adds time inputs and panels; date-time components are not implemented yet.
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
