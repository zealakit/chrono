<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getDatePanelContext } from "./context.js";
import type { DateButtonProps } from "./types.js";

let { children, ...rest }: DateButtonProps = $props();
const api = getDatePanelContext("DatePanelTodayButton");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getTodayButtonProps();
});
</script>

<button {...mergeProps(rest, chrono)}>{#if children}{@render children()}{:else}{chrono["aria-label"]}{/if}</button>
