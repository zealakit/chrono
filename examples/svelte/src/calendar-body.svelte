<script lang="ts">
// The /calendar subpath import style (the root import is used in app.svelte).
import {
  CalendarAgenda,
  CalendarAgendaDay,
  CalendarMonthGrid,
  CalendarTimeGrid,
  CalendarTimeGridColumnHeader,
  CalendarTimeGridSlot,
} from "@zealakit/chrono-svelte/calendar";

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

<!-- Whichever view is active renders; the others render nothing. -->
<CalendarMonthGrid class="month" />
<CalendarTimeGrid class="time-grid">
  {#snippet children({ days, slots })}
    <div style:--cols={days.length}>
      <div class="time-row time-head" role="row">
        <span class="time-label"></span>
        {#each days as day (day.key)}
          <CalendarTimeGridColumnHeader {day} class="col-head">
            <small>{weekday(day.date, "short")}</small>
            {day.date.day}
          </CalendarTimeGridColumnHeader>
        {/each}
      </div>
      {#each slots as slot (slot.index)}
        <div class="time-row" role="row">
          <span class="time-label">{slot.start.minute === 0 ? hhmm(slot.start) : ""}</span>
          {#each days as day (day.key)}
            <CalendarTimeGridSlot {slot} {day} class="slot" />
          {/each}
        </div>
      {/each}
    </div>
  {/snippet}
</CalendarTimeGrid>
<CalendarAgenda class="agenda">
  {#snippet children(days)}
    {#each days as day (day.key)}
      <CalendarAgendaDay {day}>
        <strong>{weekday(day.date, "long")}</strong>
        <span>{shortDate(day.date)}</span>
        <small>No events</small>
      </CalendarAgendaDay>
    {/each}
  {/snippet}
</CalendarAgenda>
