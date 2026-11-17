<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getCalendarContext } from "./context.js";
import type { WeekdayHeaderProps } from "./types.js";

let { header, children, ...rest }: WeekdayHeaderProps = $props();
const api = getCalendarContext("CalendarWeekdayHeader");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getColumnHeaderProps(header);
});
</script>

<th {...mergeProps(rest, chrono)}>{#if children}{@render children()}{:else}{header.short}{/if}</th>
