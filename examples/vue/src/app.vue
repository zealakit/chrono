<script setup lang="ts">
// The root import style (the /calendar subpath is used in calendar-body.vue).
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
} from "@zealakit/chrono-vue";
import { computed, ref } from "vue";
import CalendarBody from "./calendar-body.vue";

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

const view = ref("month");
const date = ref<PlainDate>(
  toPlainDate(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone),
);
const selected = ref<PlainDate>();
const range = ref<DateRange>();
const events = ref<AppEvent[]>(seedEvents());
const selectedEventId = ref<string | null>(null);
const moreEvents = ref<AppEvent[] | null>(null);
const draft = ref<{ start: string; end: string; allDay: boolean } | null>(null);

const busy = computed(
  () => new Set(events.value.map((e) => e.start.slice(0, 10))),
);
const isMarked = (day: PlainDate) =>
  busy.value.has(`${day.year}-${pad(day.month)}-${pad(day.day)}`);

function goTo(next: PlainDate) {
  date.value = next;
  selected.value = next;
}
function onMoreActivate(_date: PlainDate, hidden: AppEvent[]) {
  moreEvents.value = hidden;
}
function onSelectRange(proposal: {
  start: unknown;
  end: unknown;
  allDay: boolean;
}) {
  draft.value = {
    start: isoValue(proposal.start as never),
    end: isoValue(proposal.end as never),
    allDay: proposal.allDay,
  };
}
function addEvent() {
  if (!draft.value) return;
  events.value = [
    ...events.value,
    {
      id: `e${events.value.length + 1}`,
      start: draft.value.start,
      end: draft.value.end,
      allDay: draft.value.allDay,
      title: draft.value.allDay ? "New all-day" : "New event",
      calendarId: "work",
    },
  ];
  draft.value = null;
}
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <MiniCalendar
        class="mini"
        :sync-with="range ? { date, visibleRange: range } : undefined"
        :is-marked="isMarked"
        :selected-date="selected"
        @navigate="goTo"
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
        v-model:view="view"
        v-model:date="date"
        v-model:selected-event-id="selectedEventId"
        :views="CUSTOM_VIEWS"
        :selected-date="selected"
        :events="events"
        selectable
        event-limit="auto"
        :time-grid="{ start: '06:00', end: '22:00', step: 60 }"
        @visible-range-change="(next: DateRange) => (range = next)"
        @date-activate="(next: PlainDate) => (selected = next)"
        @more-activate="onMoreActivate"
        @select-range="onSelectRange"
      >
        <div class="toolbar">
          <CalendarPrevButton>‹</CalendarPrevButton>
          <CalendarTodayButton />
          <CalendarNextButton>›</CalendarNextButton>
          <CalendarTitle />
          <div class="views">
            <CalendarViewButton v-for="[id, label] in VIEWS" :key="id" :view="id">
              {{ label }}
            </CalendarViewButton>
          </div>
        </div>
        <CalendarBody />
      </Calendar>
    </main>
  </div>

  <dialog v-if="moreEvents" open class="more-dialog" @close="moreEvents = null">
    <header>
      <strong>More events</strong>
      <button type="button" @click="moreEvents = null">✕</button>
    </header>
    <ul>
      <li v-for="event in moreEvents" :key="event.id">{{ event.title }}</li>
    </ul>
  </dialog>

  <dialog v-if="draft" open class="more-dialog" @close="draft = null">
    <header>
      <strong>New event</strong>
      <button type="button" @click="draft = null">✕</button>
    </header>
    <p>{{ draft.start }} → {{ draft.end }}</p>
    <div>
      <button type="button" @click="addEvent">Save</button>
      <button type="button" @click="draft = null">Cancel</button>
    </div>
  </dialog>
</template>
