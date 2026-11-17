<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getDatePanelContext } from "./context.js";
import type { DatePanelTitleProps } from "./types.js";

let { children, ...rest }: DatePanelTitleProps = $props();
const api = getDatePanelContext("DatePanelTitle");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getTitleProps();
});
</script>

<h2 {...mergeProps(rest, chrono)}>{#if children}{@render children()}{:else}{$s.title}{/if}</h2>
