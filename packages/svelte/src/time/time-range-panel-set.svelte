<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getTimePanelContext } from "./context.js";
import TimePanelColumn from "./time-panel-column.svelte";
import type { TimeRangePanelSetProps } from "./types.js";

let {
  side,
  children,
  ...rest
}: TimeRangePanelSetProps & { side: "start" | "end" } = $props();
// svelte-ignore state_referenced_locally
const api = getTimePanelContext(
  side === "start" ? "TimeRangePanelStart" : "TimeRangePanelEnd",
);
const s = api.state;
const set = $derived($s.sets.find((item) => item.key === side));
const chrono = $derived.by(() => {
  void $s;
  return set ? api.getSetProps(set) : {};
});
</script>

{#if set}
  <div {...mergeProps(rest, chrono)}>
    {#if children}{@render children()}{:else}
      {#each set.columns as column (column.key)}<TimePanelColumn {column} />{/each}
    {/if}
  </div>
{/if}
