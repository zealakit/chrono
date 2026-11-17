<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getCalendarContext } from "./context.js";
import type { CellProps } from "./types.js";

let { day, children, ...rest }: CellProps = $props();
const api = getCalendarContext("CalendarCell");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getCellProps(day);
});
</script>

<td {...mergeProps(rest, chrono)}>{#if children}{@render children()}{:else}{day.date.day}{/if}</td>
