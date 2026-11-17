<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getDatePanelContext } from "./context.js";
import type { DatePanelWeekNumberProps } from "./types.js";

let { weekNumber, children, ...rest }: DatePanelWeekNumberProps = $props();
const api = getDatePanelContext("DatePanelWeekNumber");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getWeekNumberProps(weekNumber);
});
</script>

<th {...mergeProps(rest, chrono)}>{#if children}{@render children()}{:else}{weekNumber}{/if}</th>
