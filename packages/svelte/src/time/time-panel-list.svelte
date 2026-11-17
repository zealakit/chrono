<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getTimePanelContext } from "./context.js";
import TimePanelGroup from "./time-panel-group.svelte";
import TimePanelGroupLabel from "./time-panel-group-label.svelte";
import TimePanelOption from "./time-panel-option.svelte";
import type { TimePanelListProps } from "./types.js";

let { children, ...rest }: TimePanelListProps = $props();
const api = getTimePanelContext("TimePanelList");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getListProps();
});
</script>

<div {...mergeProps(rest, chrono)}>
  {#if children}{@render children($s.groups)}{:else}
    {#each $s.groups as group (group.key)}
      <TimePanelGroup {group}>
        {#if group.label}<TimePanelGroupLabel>{group.label}</TimePanelGroupLabel>{/if}
        {#each group.options as option (option.key)}<TimePanelOption {option} />{/each}
      </TimePanelGroup>
    {/each}
  {/if}
</div>
