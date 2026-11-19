<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getCalendarContext } from "./context.js";
import type { CalendarTimelineHeaderCellProps } from "./types.js";

let { cell, children, ...rest }: CalendarTimelineHeaderCellProps = $props();
const api = getCalendarContext("CalendarTimelineHeaderCell");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getTimelineHeaderCellProps(cell);
});
</script>

<div {...mergeProps(rest, chrono)}>{#if children}{@render children()}{:else}{cell.label}{/if}</div>
