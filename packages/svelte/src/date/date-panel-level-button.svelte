<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getDatePanelContext } from "./context.js";
import type { DateButtonProps } from "./types.js";

let { children, ...rest }: DateButtonProps = $props();
const api = getDatePanelContext("DatePanelLevelButton");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getLevelButtonProps();
});
</script>

<button {...mergeProps(rest, chrono)}>{#if children}{@render children()}{:else}{$s.title}{/if}</button>
