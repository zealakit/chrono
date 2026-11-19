<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getTimePanelContext } from "./context.js";
import TimePanelOption from "./time-panel-option.svelte";
import type { TimePanelGroupProps } from "./types.js";

let { group, children, ...rest }: TimePanelGroupProps = $props();
const api = getTimePanelContext("TimePanelGroup");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getGroupProps(group);
});
</script>

<div {...mergeProps(rest, chrono)}>
  {#if children}{@render children()}{:else}
    {#each group.options as option (option.key)}<TimePanelOption {option} />{/each}
  {/if}
</div>
