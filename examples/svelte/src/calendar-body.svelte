<script lang="ts">
// The /calendar subpath import style (the root import is used in app.svelte).
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
} from "@zealakit/chrono-svelte/calendar";

type Day = { year: number; month: number; day: number };
type AppEvent = {
  id: string;
  start: string;
  end: string;
  allDay?: boolean;
  title: string;
  calendarId?: string;
};
type Timed = {
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
const timeOf = (segment: Timed) =>
  segment.allDay ? "" : `${hhmm(segment.start)} `;
</script>

<!-- Whichever view is active renders; the others render nothing. -->
<CalendarMonthGrid class="month">
  {#snippet children(day)}
    <span class="day-num">{day.date.day}</span>
    <CalendarEvents {day}>
      {#snippet children(segments)}
        {#each segments as segment (segment.key)}
          <CalendarEvent {segment}>
            <span class="event-chip" data-calendar-id={segment.event.calendarId}>
              {#if !segment.allDay}<small>{timeOf(segment)}</small>{/if}
              {(segment.event as AppEvent).title}
            </span>
          </CalendarEvent>
        {/each}
      {/snippet}
    </CalendarEvents>
    <CalendarMoreButton {day} />
  {/snippet}
</CalendarMonthGrid>

<CalendarTimeGrid class="time-grid">
  {#snippet children({ days, slots })}
    <div style:--cols={days.length}>
      <CalendarAllDayRow>
        {#snippet children({ segments })}
          <div class="all-day-row">
            {#each days as day (day.key)}
              <CalendarEventDragPreview {day} allDay class="drag-preview" />
            {/each}
            {#each segments as segment (segment.key)}
              <CalendarEvent {segment}>
                <span class="event-block" data-calendar-id={segment.event.calendarId}>
                  <CalendarEventResizeHandle {segment} edge="start" class="resize-handle" />
                  {(segment.event as AppEvent).title}
                  <CalendarEventResizeHandle {segment} edge="end" class="resize-handle" />
                </span>
              </CalendarEvent>
            {/each}
          </div>
        {/snippet}
      </CalendarAllDayRow>
      <div class="time-row time-head" role="row">
        <span class="time-label"></span>
        {#each days as day (day.key)}
          <CalendarTimeGridColumnHeader {day} class="col-head">
            <small>{weekday(day.date, "short")}</small>
            {day.date.day}
          </CalendarTimeGridColumnHeader>
        {/each}
      </div>
      <div class="time-body">
        <div class="time-slots">
          {#each slots as slot (slot.index)}
            <div class="time-row" role="row">
              <span class="time-label">{slot.start.minute === 0 ? hhmm(slot.start) : ""}</span>
              {#each days as day (day.key)}
                <CalendarTimeGridSlot {slot} {day} class="slot" />
              {/each}
            </div>
          {/each}
        </div>
        <div class="time-events">
          {#each days as day (day.key)}
            <div class="day-col">
              <CalendarEvents {day}>
                {#snippet children(segments)}
                  {#each segments as segment (segment.key)}
                    <CalendarEvent {segment}>
                      <span class="event-block" data-calendar-id={segment.event.calendarId}>
                        <CalendarEventResizeHandle {segment} edge="start" class="resize-handle" />
                        {(segment.event as AppEvent).title}
                        <CalendarEventResizeHandle {segment} edge="end" class="resize-handle" />
                      </span>
                    </CalendarEvent>
                  {/each}
                {/snippet}
              </CalendarEvents>
              <CalendarSelectionPreview {day} />
              <CalendarEventDragPreview {day} class="drag-preview" />
            </div>
          {/each}
          <CalendarNowIndicator class="now-indicator" />
        </div>
      </div>
    </div>
  {/snippet}
</CalendarTimeGrid>

<CalendarAgenda class="agenda">
  {#snippet children(days)}
    {#each days as day (day.key)}
      <CalendarAgendaDay {day}>
        <div class="agenda-head">
          <strong>{weekday(day.date, "long")}</strong>
          <span>{shortDate(day.date)}</span>
        </div>
        <CalendarEvents {day}>
          {#snippet children(segments)}
            {#if segments.length > 0}
              <ul class="agenda-events">
                {#each segments as segment (segment.key)}
                  <li>
                    <CalendarEvent {segment}>
                      <span class="event-chip" data-calendar-id={segment.event.calendarId}>
                        {#if !segment.allDay}<small>{timeOf(segment)}</small>{/if}
                        {(segment.event as AppEvent).title}
                      </span>
                    </CalendarEvent>
                  </li>
                {/each}
              </ul>
            {:else}
              <small class="agenda-empty">No events</small>
            {/if}
          {/snippet}
        </CalendarEvents>
      </CalendarAgendaDay>
    {/each}
  {/snippet}
</CalendarAgenda>
