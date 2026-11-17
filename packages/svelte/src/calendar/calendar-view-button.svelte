<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getCalendarContext } from "./context.js";
import type { ViewButtonProps } from "./types.js";

let { view, children, ...rest }: ViewButtonProps = $props();
const api = getCalendarContext("CalendarViewButton");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getViewButtonProps(view);
});
</script>

<button {...mergeProps(rest, chrono)}>{#if children}{@render children()}{:else}{view}{/if}</button>
