<script lang="ts">
import { setDatePanelContext } from "../date/context.js";
import DatePanelGrid from "../date/date-panel-grid.svelte";
import DatePanelNextButton from "../date/date-panel-next-button.svelte";
import DatePanelPrevButton from "../date/date-panel-prev-button.svelte";
import DatePanelTitle from "../date/date-panel-title.svelte";
import { mergeProps } from "../shared/props.js";
import { getDateTimePanelContext } from "./context.js";
import type { DateTimeContainerProps } from "./types.js";

let { children, ...rest }: DateTimeContainerProps = $props();
const panel = getDateTimePanelContext("DateTimePanelDate");
const api = panel.date;
setDatePanelContext(api);
const s = api.state;
let root = $state<HTMLElement | null>(null);
$effect(() => {
  api.setRoot(root);
});
const chrono = $derived.by(() => {
  void $s;
  return api.getRootProps();
});
</script>

<div bind:this={root} {...mergeProps(rest, chrono)}>
  {#if children}{@render children()}{:else}
    <DatePanelPrevButton />
    <DatePanelTitle />
    <DatePanelNextButton />
    <DatePanelGrid />
  {/if}
</div>
