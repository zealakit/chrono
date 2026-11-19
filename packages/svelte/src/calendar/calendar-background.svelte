<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getCalendarContext } from "./context.js";
import type { BackgroundProps } from "./types.js";

let { piece, children, ...rest }: BackgroundProps = $props();
const api = getCalendarContext("CalendarBackground");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getBackgroundProps(piece);
});
</script>

<div {...mergeProps(rest, chrono)}>{@render children?.({ piece })}</div>
