<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getCalendarContext } from "./context.js";
import type { AgendaProps } from "./types.js";

let { children, ...rest }: AgendaProps = $props();
const api = getCalendarContext("CalendarAgenda");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getAgendaProps();
});
const layout = $derived($s.layout);
</script>

{#if layout.kind === "list"}
  <ul {...mergeProps(rest, chrono)}>{@render children?.(layout.days)}</ul>
{/if}
