<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getCalendarContext } from "./context.js";
import type { CalendarMoreButtonProps } from "./types.js";

let { day, children, ...rest }: CalendarMoreButtonProps = $props();
const api = getCalendarContext("CalendarMoreButton");
const s = api.state;
const overflow = $derived.by(() => {
  void $s;
  return $s.more.find((m) => m.dayKey === day.key);
});
const chrono = $derived.by(() => {
  void $s;
  return api.getMoreProps(day);
});
</script>

{#if overflow}
  <button {...mergeProps(rest, chrono)}>
    {#if children}{@render children()}{:else}+{overflow.count} more{/if}
  </button>
{/if}
