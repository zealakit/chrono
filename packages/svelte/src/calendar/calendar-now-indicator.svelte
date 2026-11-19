<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getCalendarContext } from "./context.js";
import type { NowIndicatorProps } from "./types.js";

let { children, ...rest }: NowIndicatorProps = $props();
const api = getCalendarContext("CalendarNowIndicator");
const s = api.state;
const show = $derived.by(() => {
  void $s;
  return $s.nowIndicator !== null;
});
const chrono = $derived.by(() => {
  void $s;
  return api.getNowIndicatorProps();
});
</script>

{#if show}
  <div {...mergeProps(rest, chrono)}>{@render children?.()}</div>
{/if}
