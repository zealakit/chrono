<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getMiniCalendarContext } from "./context.js";
import type { MiniGridProps } from "./types.js";
import MiniCalendarCell from "./mini-calendar-cell.svelte";
import MiniCalendarWeekdayHeader from "./mini-calendar-weekday-header.svelte";
let { children, ...rest }: MiniGridProps = $props();
const api = getMiniCalendarContext("MiniCalendarGrid");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getGridProps();
});
const layout = $derived($s.layout);
const model = $derived(layout.months[0]);
</script>

<table {...mergeProps(rest, chrono)}>
  <thead>
    <tr>
      {#if layout.weekNumbers}<td></td>{/if}
      {#each layout.weekdays as header (header.dayOfWeek)}
        <MiniCalendarWeekdayHeader {header} />
      {/each}
    </tr>
  </thead>
  <tbody>
    {#each model?.weeks ?? [] as week (week.days[0]?.key)}
      <tr>
        {#if layout.weekNumbers}<th {...api.getWeekNumberProps(week.weekNumber)}>{week.weekNumber}</th>{/if}
        {#each week.days as day (day.key)}
          {#if children}
            <MiniCalendarCell {day}>{@render children(day)}</MiniCalendarCell>
          {:else}
            <MiniCalendarCell {day} />
          {/if}
        {/each}
      </tr>
    {/each}
  </tbody>
</table>
