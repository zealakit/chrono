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
import { ref } from "vue";
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

// Static stand-in for "days that have events".
const hasEvents = (date: PlainDate) => date.day % 6 === 0;

const view = ref("month");
const date = ref<PlainDate>(
  toPlainDate(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone),
);
const selected = ref<PlainDate>();
const range = ref<DateRange>();

function goTo(next: PlainDate) {
  date.value = next;
  selected.value = next;
}
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <MiniCalendar
        class="mini"
        :sync-with="range ? { date, visibleRange: range } : undefined"
        :is-marked="hasEvents"
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
        :views="CUSTOM_VIEWS"
        :selected-date="selected"
        @visible-range-change="(next: DateRange) => (range = next)"
        @date-activate="(next: PlainDate) => (selected = next)"
      >
        <div class="toolbar">
          <CalendarPrevButton>‹</CalendarPrevButton>
          <CalendarTodayButton />
          <CalendarNextButton>›</CalendarNextButton>
          <CalendarTitle />
          <div class="views">
            <CalendarViewButton v-for="[id, label] in VIEWS" :key="id" :view="id">{{ label }}</CalendarViewButton>
          </div>
        </div>
        <CalendarBody />
        <p class="note">Events arrive in 0.3.0. These views show the empty structure they will fill.</p>
      </Calendar>
    </main>
  </div>
</template>
