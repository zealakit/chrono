<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getCalendarContext } from "./context.js";
import type { CalendarTimelineRowProps } from "./types.js";

let { row, children, ...rest }: CalendarTimelineRowProps = $props();
const api = getCalendarContext("CalendarTimelineRowHeader");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getTimelineRowHeaderProps(row);
});
</script>

<div {...mergeProps(rest, chrono)}>{#if children}{@render children()}{:else}{row.label}{/if}</div>
