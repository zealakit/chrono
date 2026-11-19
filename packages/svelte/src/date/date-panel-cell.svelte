<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getDatePanelContext } from "./context.js";
import type { DatePanelCellProps } from "./types.js";

let { day, cell, children, ...rest }: DatePanelCellProps = $props();
const api = getDatePanelContext("DatePanelCell");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return day
    ? api.getCellProps(day)
    : api.getLevelCellProps(cell as NonNullable<typeof cell>);
});
</script>

<td {...mergeProps(rest, chrono)}>{#if children}{@render children()}{:else if day}{#if !day.hidden}{day.date.day}{/if}{:else}{cell?.text}{/if}</td>
