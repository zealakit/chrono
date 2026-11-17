<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getCalendarContext } from "./context.js";
import type { TimeGridProps } from "./types.js";

let { children, ...rest }: TimeGridProps = $props();
const api = getCalendarContext("CalendarTimeGrid");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getTimeGridProps();
});
const layout = $derived($s.layout);
</script>

{#if layout.kind === "time-grid"}
  <div {...mergeProps(rest, chrono)}>{@render children?.({ days: layout.days, slots: layout.slots })}</div>
{/if}
