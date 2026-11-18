<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getCalendarContext } from "./context.js";
import type { CalendarEventResizeHandleProps } from "./types.js";

let { segment, edge, children, ...rest }: CalendarEventResizeHandleProps =
  $props();
const api = getCalendarContext("CalendarEventResizeHandle");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getResizeHandleProps(segment, edge);
});
</script>

<div {...mergeProps(rest, chrono)}>{@render children?.()}</div>
