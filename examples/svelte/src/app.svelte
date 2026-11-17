<script lang="ts">
// The root import style (the /calendar subpath is used in calendar-body.svelte).
import {
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

// Static stand-in for "days that have events".
const hasEvents = (date: PlainDate) => date.day % 6 === 0;

let view = $state("month");
let date = $state<PlainDate>(
  toPlainDate(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone),
);
let selected = $state<PlainDate | undefined>();
let range = $state<DateRange | undefined>();
</script>

<div class="shell">
  <aside class="sidebar">
    <MiniCalendar
      class="mini"
      syncWith={range ? { date, visibleRange: range } : undefined}
      isMarked={hasEvents}
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
      views={CUSTOM_VIEWS}
      selectedDate={selected}
      onVisibleRangeChange={(next) => (range = next)}
      onDateActivate={(next) => (selected = next)}
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
      <p class="note">Events arrive in 0.3.0. These views show the empty structure they will fill.</p>
    </Calendar>
  </main>
</div>
