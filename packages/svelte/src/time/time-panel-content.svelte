<script lang="ts">
import { getTimePanelContext } from "./context.js";
import TimePanelColumn from "./time-panel-column.svelte";
import TimePanelList from "./time-panel-list.svelte";
import TimeRangePanelEnd from "./time-range-panel-end.svelte";
import TimeRangePanelStart from "./time-range-panel-start.svelte";

const api = getTimePanelContext("TimePanel");
const s = api.state;
</script>

{#if $s.layout === "list"}
  <TimePanelList />
{:else}
  {#each $s.sets as set (set.key)}
    {#if $s.kind === "range"}
      {#if set.key === "start"}<TimeRangePanelStart />{:else}<TimeRangePanelEnd />{/if}
    {:else}
      {#each set.columns as column (column.key)}<TimePanelColumn {column} />{/each}
    {/if}
  {/each}
{/if}
