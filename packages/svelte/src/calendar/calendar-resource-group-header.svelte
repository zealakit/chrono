<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getCalendarContext } from "./context.js";
import type { CalendarResourceGroupHeaderProps } from "./types.js";

let { group, children, ...rest }: CalendarResourceGroupHeaderProps = $props();
const api = getCalendarContext("CalendarResourceGroupHeader");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getResourceGroupHeaderProps(group);
});
</script>

<div {...mergeProps(rest, chrono)}>{#if children}{@render children()}{:else}{group.label}{/if}</div>
