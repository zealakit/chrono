<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getTimePanelContext } from "./context.js";
import TimePanelOption from "./time-panel-option.svelte";
import type { TimePanelColumnProps } from "./types.js";

let { column, children, ...rest }: TimePanelColumnProps = $props();
const api = getTimePanelContext("TimePanelColumn");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getColumnProps(column);
});
</script>

<div {...mergeProps(rest, chrono)}>
  {#if children}{@render children(column)}{:else}
    {#each column.options as option (option.key)}<TimePanelOption {option} />{/each}
  {/if}
</div>
