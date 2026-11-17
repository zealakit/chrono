<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getDatePanelContext } from "./context.js";
import type { DatePanelWeekdayHeaderProps } from "./types.js";

let { header, children, ...rest }: DatePanelWeekdayHeaderProps = $props();
const api = getDatePanelContext("DatePanelWeekdayHeader");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getColumnHeaderProps(header);
});
</script>

<th {...mergeProps(rest, chrono)}>{#if children}{@render children()}{:else}{header.short}{/if}</th>
