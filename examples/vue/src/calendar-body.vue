<script setup lang="ts">
// The /calendar subpath import style (the root import is used in app.vue).
import {
  CalendarAgenda,
  CalendarAgendaDay,
  CalendarMonthGrid,
  CalendarTimeGrid,
  CalendarTimeGridColumnHeader,
  CalendarTimeGridSlot,
} from "@zealakit/chrono-vue/calendar";

type Day = { year: number; month: number; day: number };
const weekday = (date: Day, width: "short" | "long") =>
  new Intl.DateTimeFormat(undefined, {
    weekday: width,
    timeZone: "UTC",
  }).format(Date.UTC(date.year, date.month - 1, date.day));
const shortDate = (date: Day) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(Date.UTC(date.year, date.month - 1, date.day));
const hhmm = (time: { hour: number; minute: number }) =>
  `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`;
</script>

<template>
  <!-- Whichever view is active renders; the others render nothing. -->
  <CalendarMonthGrid class="month" />
  <CalendarTimeGrid class="time-grid">
    <template #default="{ days, slots }">
      <div :style="{ '--cols': days.length }">
        <div class="time-row time-head" role="row">
          <span class="time-label" />
          <CalendarTimeGridColumnHeader v-for="day in days" :key="day.key" :day="day" class="col-head">
            <small>{{ weekday(day.date, "short") }}</small>
            {{ day.date.day }}
          </CalendarTimeGridColumnHeader>
        </div>
        <div v-for="slot in slots" :key="slot.index" class="time-row" role="row">
          <span class="time-label">{{ slot.start.minute === 0 ? hhmm(slot.start) : "" }}</span>
          <CalendarTimeGridSlot v-for="day in days" :key="day.key" :slot="slot" :day="day" class="slot" />
        </div>
      </div>
    </template>
  </CalendarTimeGrid>
  <CalendarAgenda class="agenda">
    <template #default="{ days }">
      <CalendarAgendaDay v-for="day in days" :key="day.key" :day="day">
        <strong>{{ weekday(day.date, "long") }}</strong>
        <span>{{ shortDate(day.date) }}</span>
        <small>No events</small>
      </CalendarAgendaDay>
    </template>
  </CalendarAgenda>
</template>
