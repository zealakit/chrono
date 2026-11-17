<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getTimeFieldContext } from "./context.js";
import type { TimeInputSegmentProps } from "./types.js";

let { segment, children, ...rest }: TimeInputSegmentProps = $props();
const api = getTimeFieldContext("TimeInputSegment");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getSegmentProps(segment);
});
</script>

<span {...mergeProps(rest, chrono)}>{#if children}{@render children(segment)}{:else}{segment.text}{/if}</span>
