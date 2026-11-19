<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getMiniCalendarContext } from "./context.js";
import type { WeekdayHeaderProps } from "./types.js";

let { header, children, ...rest }: WeekdayHeaderProps = $props();
const api = getMiniCalendarContext("MiniCalendarWeekdayHeader");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getColumnHeaderProps(header);
});
</script>

<th {...mergeProps(rest, chrono)}>{#if children}{@render children()}{:else}{header.short}{/if}</th>
