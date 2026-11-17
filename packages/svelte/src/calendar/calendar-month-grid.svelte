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
let table = $state<HTMLTableElement | null>(null);
let observer: ResizeObserver | undefined;

// `eventLimit: "auto"` measures the first cell and first event, then sets the
// limit (plan 05 §3.1). Browser-only; SSR / no ResizeObserver keeps 3.
$effect(() => {
  void $s;
  if (month !== 0) return;
  if (api.controller.getEventLimit() !== "auto") return;
  if (!table || typeof ResizeObserver === "undefined") return;
  const measure = (): void => {
    const cell = table?.querySelector('td[role="gridcell"]');
    const event = table?.querySelector("[data-chrono-event]");
    if (!cell || !event) return;
    const cellHeight = (cell as HTMLElement).clientHeight;
    const eventHeight = (event as HTMLElement).offsetHeight;
    if (cellHeight > 0 && eventHeight > 0) {
      api.controller.setEventLimit(
        Math.max(1, Math.floor(cellHeight / eventHeight)),
      );
    }
  };
  measure();
  observer = new ResizeObserver(measure);
  observer.observe(table);
  return () => observer?.disconnect();
});

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
  <table bind:this={table} {...mergeProps(rest, chrono)}>
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
