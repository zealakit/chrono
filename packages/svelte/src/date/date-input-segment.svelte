<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getDateFieldContext } from "./context.js";
import type { DateInputSegmentProps } from "./types.js";

let { segment, children, ...rest }: DateInputSegmentProps = $props();
const api = getDateFieldContext("DateInputSegment");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getSegmentProps(segment);
});
</script>

<span {...mergeProps(rest, chrono)}>{#if children}{@render children(segment)}{:else}{segment.text}{/if}</span>
