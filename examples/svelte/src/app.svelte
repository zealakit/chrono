<script lang="ts">
// The root import style (the /calendar subpath is used in calendar-body.svelte).
import {
  type CalendarEventInput,
  Calendar,
  CalendarNextButton,
  CalendarPrevButton,
  CalendarTitle,
  CalendarTodayButton,
  CalendarViewButton,
  type CustomViews,
  type DateRange,
  MiniCalendar,
  MiniCalendarGrid,
  MiniCalendarNextButton,
  MiniCalendarPrevButton,
  MiniCalendarTitle,
  type PlainDate,
  recurrence,
  toPlainDate,
} from "@zealakit/chrono-svelte";
import CalendarBody from "./calendar-body.svelte";

const VIEWS = [
  ["month", "Month"],
  ["week", "Week"],
  ["workWeek", "Work week"],
  ["day", "Day"],
  ["agenda", "Agenda"],
  ["threeDay", "3 days"],
] as const;

// A custom view is just data (plan 04 C3).
const CUSTOM_VIEWS: CustomViews = {
  threeDay: { layout: "time-grid", length: { days: 3 }, align: "day" },
};

type AppEvent = {
  id: string;
  start: string;
  end: string;
  allDay?: boolean;
  title: string;
  calendarId?: string;
  rrule?: string;
};

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dt = (d: Date, hour: number, minute = 0) =>
  `${iso(d)}T${pad(hour)}:${pad(minute)}:00`;
const add = (d: Date, days: number) => {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
};

function seedEvents(): AppEvent[] {
  const today = new Date();
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return [
    {
      id: "e1",
      start: iso(t0),
      end: iso(add(t0, 1)),
      allDay: true,
      title: "Company holiday",
      calendarId: "personal",
    },
    {
      id: "e2",
      start: dt(t0, 9),
      end: dt(t0, 10),
      title: "Daily stand-up",
      calendarId: "work",
    },
    {
      id: "r1",
      start: dt(add(t0, -14), 9),
      end: dt(add(t0, -14), 9, 15),
      title: "Weekly stand-up",
      calendarId: "work",
      rrule: "FREQ=WEEKLY;COUNT=8",
    },
    {
      id: "e3",
      start: dt(t0, 9, 30),
      end: dt(t0, 10, 30),
      title: "Design review",
      calendarId: "work",
    },
    {
      id: "e4",
      start: dt(t0, 11),
      end: dt(t0, 12),
      title: "1:1 with Ana",
      calendarId: "work",
    },
    {
      id: "e5",
      start: dt(t0, 13),
      end: dt(t0, 14),
      title: "Lunch",
      calendarId: "personal",
    },
    {
      id: "e6",
      start: dt(t0, 15),
      end: dt(t0, 16, 30),
      title: "Planning",
      calendarId: "work",
    },
    {
      id: "e7",
      start: dt(add(t0, 1), 10),
      end: dt(add(t0, 2), 10),
      title: "Off-site (2 days)",
      calendarId: "work",
    },
    {
      id: "e8",
      start: dt(t0, 12),
      end: dt(t0, 12, 5),
      title: "Reminder",
      calendarId: "personal",
    },
  ];
}

/** A selection value as ISO; timed values keep their time (plan 05 E14). */
const isoValue = (
  value:
    | string
    | {
        year: number;
        month: number;
        day: number;
        hour?: number;
        minute?: number;
        second?: number;
      },
): string => {
  if (typeof value === "string") return value;
  const date = `${value.year}-${pad(value.month)}-${pad(value.day)}`;
  if (value.hour === undefined) return date;
  return `${date}T${pad(value.hour)}:${pad(value.minute ?? 0)}:${pad(value.second ?? 0)}`;
};

let view = $state("month");
let date = $state<PlainDate>(
  toPlainDate(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone),
);
let selected = $state<PlainDate | undefined>();
let range = $state<DateRange | undefined>();
let events = $state<AppEvent[]>(seedEvents());
let selectedEventId = $state<string | null>(null);
let moreEvents = $state<AppEvent[] | null>(null);
let draft = $state<{ start: string; end: string; allDay: boolean } | null>(
  null,
);

const isMarked = (day: PlainDate) =>
  events.some(
    (event) =>
      event.start.slice(0, 10) ===
      `${day.year}-${pad(day.month)}-${pad(day.day)}`,
  );

function onMoreActivate(_date: PlainDate, hidden: CalendarEventInput[]) {
  moreEvents = hidden as AppEvent[];
}
function onSelectRange(proposal: {
  start: unknown;
  end: unknown;
  allDay: boolean;
}) {
  draft = {
    start: isoValue(proposal.start as never),
    end: isoValue(proposal.end as never),
    allDay: proposal.allDay,
  };
}
function addEvent() {
  if (!draft) return;
  events = [
    ...events,
    {
      id: `e${events.length + 1}`,
      start: draft.start,
      end: draft.end,
      allDay: draft.allDay,
      title: draft.allDay ? "New all-day" : "New event",
      calendarId: "work",
    },
  ];
  draft = null;
}
</script>

<div class="shell">
  <aside class="sidebar">
    <MiniCalendar
      class="mini"
      syncWith={range ? { date, visibleRange: range } : undefined}
      isMarked={isMarked}
      selectedDate={selected}
      onNavigate={(next) => {
        date = next;
        selected = next;
      }}
    >
      <div class="mini-head">
        <MiniCalendarPrevButton>‹</MiniCalendarPrevButton>
        <MiniCalendarTitle />
        <MiniCalendarNextButton>›</MiniCalendarNextButton>
      </div>
      <MiniCalendarGrid />
    </MiniCalendar>
  </aside>
  <main class="main">
    <Calendar
      bind:view
      {date}
      onDateChange={(next) => (date = next)}
      bind:selectedEventId
      {events}
      {recurrence}
      selectable
      eventLimit="auto"
      timeGrid={{ start: "06:00", end: "22:00", step: 60 }}
      views={CUSTOM_VIEWS}
      selectedDate={selected}
      onVisibleRangeChange={(next) => (range = next)}
      onDateActivate={(next) => (selected = next)}
      onMoreActivate={onMoreActivate}
      onSelectRange={onSelectRange}
    >
      <div class="toolbar">
        <CalendarPrevButton>‹</CalendarPrevButton>
        <CalendarTodayButton />
        <CalendarNextButton>›</CalendarNextButton>
        <CalendarTitle />
        <div class="views">
          {#each VIEWS as [id, label] (id)}
            <CalendarViewButton view={id}>{label}</CalendarViewButton>
          {/each}
        </div>
      </div>
      <CalendarBody />
    </Calendar>
  </main>
</div>

{#if moreEvents}
  <dialog open class="more-dialog" onclose={() => (moreEvents = null)}>
    <header>
      <strong>More events</strong>
      <button type="button" onclick={() => (moreEvents = null)}>✕</button>
    </header>
    <ul>
      {#each moreEvents as event (event.id)}
        <li>{event.title}</li>
      {/each}
    </ul>
  </dialog>
{/if}

{#if draft}
  <dialog open class="more-dialog" onclose={() => (draft = null)}>
    <header>
      <strong>New event</strong>
      <button type="button" onclick={() => (draft = null)}>✕</button>
    </header>
    <p>{draft.start} → {draft.end}</p>
    <div>
      <button type="button" onclick={addEvent}>Save</button>
      <button type="button" onclick={() => (draft = null)}>Cancel</button>
    </div>
  </dialog>
{/if}
