<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getCalendarContext } from "./context.js";
import type { CalendarTimelineCellProps } from "./types.js";

let { row, slot, children, ...rest }: CalendarTimelineCellProps = $props();
const api = getCalendarContext("CalendarTimelineCell");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getTimelineCellProps(row, slot);
});
</script>

<div {...mergeProps(rest, chrono)}>{@render children?.()}</div>
