<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getDateTimeFieldContext } from "./context.js";
import type { DateTimeInputSegmentProps } from "./types.js";

let { segment, children, ...rest }: DateTimeInputSegmentProps = $props();
const api = getDateTimeFieldContext("DateTimeInputSegment");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getSegmentProps(segment);
});
</script>

<span {...mergeProps(rest, chrono)}>{#if children}{@render children(segment)}{:else}{segment.text}{/if}</span>
