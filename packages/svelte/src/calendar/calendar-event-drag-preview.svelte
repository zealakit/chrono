<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getCalendarContext } from "./context.js";
import type { CalendarEventDragPreviewProps } from "./types.js";

let {
  day,
  allDay = false,
  children,
  ...rest
}: CalendarEventDragPreviewProps = $props();
const api = getCalendarContext("CalendarEventDragPreview");
const s = api.state;
const pieces = $derived.by(() => {
  void $s;
  return api.getDragPreviewPieces(day, allDay);
});
</script>

{#each pieces as piece (piece.key)}
  <div {...mergeProps(rest, api.getDragPreviewProps(piece))}>{@render children?.(piece)}</div>
{/each}
