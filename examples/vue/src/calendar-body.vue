<script setup lang="ts">
// The /calendar subpath import style (the root import is used in app.vue).
import {
  CalendarAgenda,
  CalendarAgendaDay,
  CalendarAllDayRow,
  CalendarEvent,
  CalendarEventDragPreview,
  CalendarEventResizeHandle,
  CalendarEvents,
  CalendarMonthGrid,
  CalendarMoreButton,
  CalendarNowIndicator,
  CalendarSelectionPreview,
  CalendarTimeGrid,
  CalendarTimeGridColumnHeader,
  CalendarTimeGridSlot,
} from "@zealakit/chrono-vue/calendar";

type Day = { year: number; month: number; day: number };
type AppEvent = {
  id: string;
  start: string;
  end: string;
  allDay?: boolean;
  title: string;
  calendarId?: string;
};
type Segment = {
  key: string;
  event: AppEvent;
  start: { hour: number; minute: number };
  allDay: boolean;
};

const pad = (n: number) => String(n).padStart(2, "0");
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
  `${pad(time.hour)}:${pad(time.minute)}`;
const timeOf = (segment: Segment) =>
  segment.allDay ? "" : `${hhmm(segment.start)} `;
</script>

<template>
  <!-- Whichever view is active renders; the others render nothing. -->
  <CalendarMonthGrid class="month">
    <template #default="{ day }">
      <span class="day-num">{{ day.date.day }}</span>
      <CalendarEvents :day="day">
        <template #default="{ segments }">
          <CalendarEvent
            v-for="segment in segments"
            :key="segment.key"
            :segment="segment"
          >
            <span class="event-chip" :data-calendar-id="segment.event.calendarId">
              <small v-if="!segment.allDay">{{ timeOf(segment) }}</small>
              {{ segment.event.title }}
            </span>
          </CalendarEvent>
        </template>
      </CalendarEvents>
      <CalendarMoreButton :day="day" />
    </template>
  </CalendarMonthGrid>

  <CalendarTimeGrid class="time-grid">
    <template #default="{ days, slots }">
      <div :style="{ '--cols': days.length }">
        <CalendarAllDayRow>
          <template #default="{ segments }">
            <div class="all-day-row">
              <CalendarEventDragPreview
                v-for="day in days"
                :key="day.key"
                :day="day"
                all-day
                class="drag-preview"
              />
              <CalendarEvent
                v-for="segment in segments"
                :key="segment.key"
                :segment="segment"
              >
                <span class="event-block" :data-calendar-id="segment.event.calendarId">
                  <CalendarEventResizeHandle
                    :segment="segment"
                    edge="start"
                    class="resize-handle"
                  />
                  {{ segment.event.title }}
                  <CalendarEventResizeHandle
                    :segment="segment"
                    edge="end"
                    class="resize-handle"
                  />
                </span>
              </CalendarEvent>
            </div>
          </template>
        </CalendarAllDayRow>
        <div class="time-row time-head" role="row">
          <span class="time-label" />
          <CalendarTimeGridColumnHeader
            v-for="day in days"
            :key="day.key"
            :day="day"
            class="col-head"
          >
            <small>{{ weekday(day.date, "short") }}</small>
            {{ day.date.day }}
          </CalendarTimeGridColumnHeader>
        </div>
        <div class="time-body">
          <div class="time-slots">
            <div v-for="slot in slots" :key="slot.index" class="time-row" role="row">
              <span class="time-label">{{
                slot.start.minute === 0 ? hhmm(slot.start) : ""
              }}</span>
              <CalendarTimeGridSlot
                v-for="day in days"
                :key="day.key"
                :slot="slot"
                :day="day"
                class="slot"
              />
            </div>
          </div>
          <div class="time-events">
            <div v-for="day in days" :key="day.key" class="day-col">
              <CalendarEvents :day="day">
                <template #default="{ segments }">
                  <CalendarEvent
                    v-for="segment in segments"
                    :key="segment.key"
                    :segment="segment"
                  >
                    <span
                      class="event-block"
                      :data-calendar-id="segment.event.calendarId"
                    >
                      <CalendarEventResizeHandle
                      :segment="segment"
                      edge="start"
                      class="resize-handle"
                    />
                    {{ segment.event.title }}
                    <CalendarEventResizeHandle
                      :segment="segment"
                      edge="end"
                      class="resize-handle"
                    />
                    </span>
                  </CalendarEvent>
                </template>
              </CalendarEvents>
              <CalendarSelectionPreview :day="day" />
              <CalendarEventDragPreview :day="day" class="drag-preview" />
            </div>
            <CalendarNowIndicator class="now-indicator" />
          </div>
        </div>
      </div>
    </template>
  </CalendarTimeGrid>

  <CalendarAgenda class="agenda">
    <template #default="{ days }">
      <CalendarAgendaDay v-for="day in days" :key="day.key" :day="day">
        <div class="agenda-head">
          <strong>{{ weekday(day.date, "long") }}</strong>
          <span>{{ shortDate(day.date) }}</span>
        </div>
        <CalendarEvents :day="day">
          <template #default="{ segments }">
            <ul v-if="segments.length" class="agenda-events">
              <li v-for="segment in segments" :key="segment.key">
                <CalendarEvent :segment="segment">
                  <span
                    class="event-chip"
                    :data-calendar-id="segment.event.calendarId"
                  >
                    <small v-if="!segment.allDay">{{ timeOf(segment) }}</small>
                    {{ segment.event.title }}
                  </span>
                </CalendarEvent>
              </li>
            </ul>
            <small v-else class="agenda-empty">No events</small>
          </template>
        </CalendarEvents>
      </CalendarAgendaDay>
    </template>
  </CalendarAgenda>
</template>
