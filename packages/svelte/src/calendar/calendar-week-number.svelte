<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getCalendarContext } from "./context.js";
import type { WeekNumberProps } from "./types.js";

let { weekNumber, children, ...rest }: WeekNumberProps = $props();
const api = getCalendarContext("CalendarWeekNumber");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getWeekNumberProps(weekNumber);
});
</script>

<th {...mergeProps(rest, chrono)}>{#if children}{@render children()}{:else}{weekNumber}{/if}</th>
