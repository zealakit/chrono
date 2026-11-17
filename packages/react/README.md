# @zealakit/chrono-react

[English](https://github.com/zealakit/chrono/blob/main/packages/react/README.md) | [Tiếng Việt](https://github.com/zealakit/chrono/blob/main/packages/react/README_VI.md) | [中文](https://github.com/zealakit/chrono/blob/main/packages/react/README_CN.md)

![Zealakit Chrono cover](https://github.com/zealakit/chrono/blob/main/assets/images/chrono-cover.jpg?raw=true)

Headless Calendar components for React: month, week, work week, day, agenda, multi-month and custom views, navigation, and a Mini Calendar. You own visual styling.

Chrono ships no CSS and sets no visual styles. Parts render your own elements and classes; state is exposed as `data-*` and ARIA attributes, so your CSS owns every look.

Pre-1.0: the API may change between minor versions. This release has no events yet; the views show the empty structure that events will fill.

> **Note**
> Chrono is a focused, headless set of Calendar views and, in later releases, Date, Time and DateTime components. It ships no CSS and renders no styled markup, so you keep full control of the visuals. Release 0.2.0 has the Calendar views and the Mini Calendar. Events, date and time inputs and panels are not implemented yet.
>
> Chrono is not a full UI library or design system, and it ships no popup, overlay, or positioning code. Put its panels inside your own popup when you need one.

## Install

```bash
npm install @zealakit/chrono-react
```

Peer dependencies: `react` `^18.0.0 || ^19.0.0`, `react-dom` `^18.0.0 || ^19.0.0`.

## Calendar

### Quick start

Create a calendar, then compose its parts. Every part is optional; render only what you need.

```tsx
import {
  Calendar,
  CalendarMonthGrid,
  CalendarNextButton,
  CalendarPrevButton,
  CalendarTitle,
} from "@zealakit/chrono-react";

export function Planner() {
  return (
    <Calendar locale="en-US" weekStartsOn={1}>
      <CalendarPrevButton>Prev</CalendarPrevButton>
      <CalendarTitle />
      <CalendarNextButton>Next</CalendarNextButton>
      <CalendarMonthGrid className="month" />
    </Calendar>
  );
}
```

### Import styles

Every domain is reachable from the root entry and from its own subpath. Both give the same bindings, so you can mix them freely.

```ts
// Domain subpath
import { Calendar, CalendarMonthGrid } from "@zealakit/chrono-react/calendar";

// Root entry: re-exports every domain, same bindings
import { Calendar, getCalendarTitle } from "@zealakit/chrono-react";
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

```tsx
<Calendar
  views={{ threeDay: { layout: "time-grid", length: { days: 3 }, align: "day" } }}
  defaultView="threeDay"
/>
```

### Controlled usage

Leave `view` and `date` unset for uncontrolled use, or control them yourself. Calendar only reports changes and never persists anything.

```tsx
const [view, setView] = useState("month");
const [date, setDate] = useState(toPlainDate("2026-11-17"));

<Calendar view={view} onViewChange={setView} date={date} onDateChange={setDate} />
```

### Mini Calendar

The Mini Calendar has its own month. Pass `syncWith` and it follows the main calendar when the main date leaves its month; the user can still page it independently.

```tsx
<MiniCalendar
  syncWith={range ? { date, visibleRange: range } : undefined}
  isMarked={(day) => hasEvents(day)}
  onNavigate={setDate}
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

```tsx
<Calendar now={now} locale="en-US" timeZone="UTC" />
```

## React Server Components

Components and hooks are client components. The utilities (`getCalendarTitle`, `getRange`, `getVisibleRange`, `toPlainDate`, `toIsoString`, `isSameDay`) carry no directive, so Server Components and server actions can call them from either entry.

```ts
// A Server Component: no "use client" needed for utilities.
import { getCalendarTitle, getRange } from "@zealakit/chrono-react/calendar";
```

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

The [Chrono React skill](https://github.com/zealakit/chrono/blob/main/skills/chrono-react.md) covers integration steps for agents.

## License

MIT © Zealakit
