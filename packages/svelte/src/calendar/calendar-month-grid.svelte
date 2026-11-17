<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getCalendarContext } from "./context.js";
import type { MonthGridProps } from "./types.js";
import CalendarCell from "./calendar-cell.svelte";
import CalendarWeekNumber from "./calendar-week-number.svelte";
import CalendarWeekdayHeader from "./calendar-weekday-header.svelte";
let { month = 0, children, ...rest }: MonthGridProps = $props();
const api = getCalendarContext("CalendarMonthGrid");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getGridProps(month);
});
const layout = $derived($s.layout);
const model = $derived(
  layout.kind === "month" ? layout.months[month] : undefined,
);
</script>

{#if layout.kind === "month" && model}
  <table {...mergeProps(rest, chrono)}>
    <thead>
      <tr>
        {#if layout.weekNumbers}<td></td>{/if}
        {#each layout.weekdays as header (header.dayOfWeek)}
          <CalendarWeekdayHeader {header} />
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each model.weeks as week (week.days[0]?.key)}
        <tr>
          {#if layout.weekNumbers}<CalendarWeekNumber weekNumber={week.weekNumber} />{/if}
          {#each week.days as day (day.key)}
            {#if !day.hidden}
              {#if children}
                <CalendarCell {day}>{@render children(day)}</CalendarCell>
              {:else}
                <CalendarCell {day} />
              {/if}
            {/if}
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
{/if}
