<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getCalendarContext } from "./context.js";
import type { SelectionPreviewProps } from "./types.js";

let { day, children, ...rest }: SelectionPreviewProps = $props();
const api = getCalendarContext("CalendarSelectionPreview");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getSelectionPreviewProps(day);
});
const show = $derived.by(() => {
  void $s;
  return Object.keys(api.getSelectionPreviewProps(day)).length > 0;
});
</script>

{#if show}
  <div {...mergeProps(rest, chrono)}>{@render children?.()}</div>
{/if}
