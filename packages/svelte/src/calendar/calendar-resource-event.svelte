<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getCalendarContext } from "./context.js";
import type { CalendarResourceEventProps } from "./types.js";

let { piece, children, ...rest }: CalendarResourceEventProps = $props();
const api = getCalendarContext("CalendarResourceEvent");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getResourcePieceProps(piece);
});
</script>

<div {...mergeProps(rest, chrono)}>{@render children?.()}</div>
