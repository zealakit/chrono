<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getCalendarContext } from "./context.js";
import type { TimeGridSlotProps } from "./types.js";

let { slot, day, children, ...rest }: TimeGridSlotProps = $props();
const api = getCalendarContext("CalendarTimeGridSlot");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getSlotProps(slot, day);
});
</script>

<div {...mergeProps(rest, chrono)}>{@render children?.()}</div>
