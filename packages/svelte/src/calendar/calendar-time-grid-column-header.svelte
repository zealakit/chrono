<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getCalendarContext } from "./context.js";
import type { TimeGridColumnHeaderProps } from "./types.js";

let { day, children, ...rest }: TimeGridColumnHeaderProps = $props();
const api = getCalendarContext("CalendarTimeGridColumnHeader");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getColumnHeaderProps(day);
});
</script>

<div {...mergeProps(rest, chrono)}>{#if children}{@render children()}{:else}{day.date.day}{/if}</div>
