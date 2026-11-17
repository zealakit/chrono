<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getDatePanelContext } from "./context.js";
import DatePanelCell from "./date-panel-cell.svelte";
import DatePanelWeekNumber from "./date-panel-week-number.svelte";
import DatePanelWeekdayHeader from "./date-panel-weekday-header.svelte";
import type { DatePanelGridProps } from "./types.js";

let { month = 0, children, ...rest }: DatePanelGridProps = $props();
const api = getDatePanelContext("DatePanelGrid");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getGridProps();
});
const model = $derived($s.level === "day" ? $s.months[month] : undefined);
const rows = $derived.by(() => {
  const list: (typeof $s.cells)[] = [];
  $s.cells.forEach((cell, index) => {
    if (index % 4 === 0) list.push([]);
    list[list.length - 1]?.push(cell);
  });
  return list;
});
</script>

{#if $s.level === "day"}
  {#if model}
    <table {...mergeProps(rest, chrono)}>
      <thead>
        <tr>
          {#if $s.weekNumbers}<td></td>{/if}
          {#each $s.weekdays as header (header.dayOfWeek)}
            <DatePanelWeekdayHeader {header} />
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each model.weeks as week (`${week.days[0]?.date.month}-${week.days[0]?.date.day}`)}
          <tr>
            {#if $s.weekNumbers}<DatePanelWeekNumber weekNumber={week.weekNumber} />{/if}
            {#each week.days as day (`${day.date.month}-${day.date.day}`)}
              {#if children && !day.hidden}
                <DatePanelCell {day}>{@render children(day)}</DatePanelCell>
              {:else}
                <DatePanelCell {day} />
              {/if}
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
{:else if month === 0}
  <table {...mergeProps(rest, chrono)}>
    <tbody>
      {#each rows as row (row[0]?.key)}
        <tr>
          {#each row as cell (cell.key)}
            <DatePanelCell {cell} />
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
{/if}
