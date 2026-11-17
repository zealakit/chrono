<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getTimeFieldContext } from "./context.js";
import type { TimeInputLiteralProps } from "./types.js";

let { segment, children, ...rest }: TimeInputLiteralProps = $props();
const api = getTimeFieldContext("TimeInputLiteral");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getSegmentProps(segment);
});
</script>

<span {...mergeProps(rest, chrono)}>{#if children}{@render children()}{:else}{segment.text}{/if}</span>
