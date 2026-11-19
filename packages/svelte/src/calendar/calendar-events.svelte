<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getCalendarContext } from "./context.js";
import type { CalendarEventsProps } from "./types.js";

let { day, children, ...rest }: CalendarEventsProps = $props();
const api = getCalendarContext("CalendarEvents");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  const state = $s;
  return {
    role: "group",
    "aria-label": state.messages.events,
    "data-interacting":
      state.focus.mode === "interaction" && state.focus.cellKey === day.key
        ? ""
        : undefined,
  };
});
const segments = $derived.by(() => {
  void $s;
  return api.controller.getCellEventSegments(day);
});
</script>

<div {...mergeProps(rest, chrono)}>{@render children?.(segments)}</div>
