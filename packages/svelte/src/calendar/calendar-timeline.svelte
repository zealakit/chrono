<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getCalendarContext } from "./context.js";
import type { CalendarTimelineProps } from "./types.js";

let { children, ...rest }: CalendarTimelineProps = $props();
const api = getCalendarContext("CalendarTimeline");
const s = api.state;
const layout = $derived.by(() => {
  const resources = $s.resources;
  return resources && resources.kind === "timeline" ? resources : null;
});
const chrono = $derived.by(() => {
  void $s;
  return api.getTimelineProps();
});
</script>

{#if layout}
  <div {...mergeProps(rest, chrono)}>{@render children?.(layout)}</div>
{/if}
