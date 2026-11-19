<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getCalendarContext } from "./context.js";
import type { CalendarResourceGridProps } from "./types.js";

let { children, ...rest }: CalendarResourceGridProps = $props();
const api = getCalendarContext("CalendarResourceGrid");
const s = api.state;
const layout = $derived.by(() => {
  const resources = $s.resources;
  return resources && resources.kind === "resource-time-grid"
    ? resources
    : null;
});
</script>

{#if layout}
  <div {...mergeProps(rest, { role: "grid" })}>{@render children?.(layout)}</div>
{/if}
