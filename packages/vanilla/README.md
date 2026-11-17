# @zealakit/chrono-vanilla

[English](https://github.com/zealakit/chrono/blob/main/packages/vanilla/README.md) | [Tiếng Việt](https://github.com/zealakit/chrono/blob/main/packages/vanilla/README_VI.md) | [中文](https://github.com/zealakit/chrono/blob/main/packages/vanilla/README_CN.md)

![Zealakit Chrono cover](https://github.com/zealakit/chrono/blob/main/assets/images/chrono-cover.jpg?raw=true)

Headless Calendar controllers for plain DOM: month, week, work week, day, agenda, multi-month and custom views, navigation, and a Mini Calendar. You render the markup and own visual styling.

Chrono ships no CSS and sets no visual styles. Parts render your own elements and classes; state is exposed as `data-*` and ARIA attributes, so your CSS owns every look.

Pre-1.0: the API may change between minor versions.

> **Note**
> Chrono is a focused, headless set of Calendar views and, in later releases, Date, Time and DateTime components. It ships no CSS and renders no styled markup, so you keep full control of the visuals. Release 0.3.0 adds events to the Calendar views: layout, selection, "+N more" overflow and a now-indicator. Date and time inputs and panels are not implemented yet.
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
