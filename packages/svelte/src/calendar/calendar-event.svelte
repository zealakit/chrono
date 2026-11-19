<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getCalendarContext } from "./context.js";
import type { CalendarEventProps } from "./types.js";

let { segment, children, ...rest }: CalendarEventProps = $props();
const api = getCalendarContext("CalendarEvent");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getEventProps(segment);
});
</script>

<div {...mergeProps(rest, chrono)}>{@render children?.()}</div>
