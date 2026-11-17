<script lang="ts">
import { mergeProps } from "../shared/props.js";
import TimePanelColumn from "../time/time-panel-column.svelte";
import TimePanelList from "../time/time-panel-list.svelte";
import { setTimePanelContext } from "../time/context.js";
import { getDateTimePanelContext } from "./context.js";
import type { DateTimeContainerProps } from "./types.js";

let { children, ...rest }: DateTimeContainerProps = $props();
const panel = getDateTimePanelContext("DateTimeRangePanelEndTime");
const api = panel.endTime;
setTimePanelContext(api);
const s = api.state;
let root = $state<HTMLElement | null>(null);
$effect(() => {
  api.setRoot(root);
});
const chrono = $derived.by(() => {
  void $s;
  return api.getRootProps();
});
const panelState = panel.state;
const timeState = $derived(
  (
    $panelState as unknown as Record<
      string,
      { layout: string; sets: { columns: { key: string }[] }[] }
    >
  )["endTime"],
);
</script>

<div bind:this={root} {...mergeProps(rest, chrono)}>
  {#if children}{@render children()}{:else if timeState?.layout === "list"}<TimePanelList />{:else}
    {#each timeState?.sets[0]?.columns ?? [] as column (column.key)}<TimePanelColumn column={column as never} />{/each}
  {/if}
</div>
