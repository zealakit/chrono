<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getCalendarContext } from "./context.js";
import type { AgendaDayProps } from "./types.js";

let { day, children, ...rest }: AgendaDayProps = $props();
const api = getCalendarContext("CalendarAgendaDay");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getAgendaDayProps(day);
});
</script>

<li {...mergeProps(rest, chrono)}>{#if children}{@render children()}{:else}{day.key}{/if}</li>
