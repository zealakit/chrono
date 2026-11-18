<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getCalendarContext } from "./context.js";
import type { CalendarResourceHeaderProps } from "./types.js";

let { column, children, ...rest }: CalendarResourceHeaderProps = $props();
const api = getCalendarContext("CalendarResourceHeader");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getResourceHeaderProps(column);
});
</script>

<div {...mergeProps(rest, chrono)}>{#if children}{@render children()}{:else}{column.label}{/if}</div>
