<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getCalendarContext } from "./context.js";
import type { CalendarTimelineRowProps } from "./types.js";

let { row, children, ...rest }: CalendarTimelineRowProps = $props();
const api = getCalendarContext("CalendarTimelineRow");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getTimelineRowProps(row);
});
</script>

<div {...mergeProps(rest, chrono)}>{@render children?.()}</div>
