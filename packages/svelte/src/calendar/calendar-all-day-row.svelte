<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getCalendarContext } from "./context.js";
import type { CalendarAllDayRowProps } from "./types.js";

let { children, ...rest }: CalendarAllDayRowProps = $props();
const api = getCalendarContext("CalendarAllDayRow");
const s = api.state;
const layout = $derived.by(() => {
  void $s;
  return $s.layout;
});
const allDayRow = $derived.by(() => {
  void $s;
  return $s.allDayRow;
});
</script>

{#if layout.kind === "time-grid"}
  <div {...mergeProps(rest, {})}>
    {@render children?.({ days: layout.days, segments: allDayRow })}
  </div>
{/if}
