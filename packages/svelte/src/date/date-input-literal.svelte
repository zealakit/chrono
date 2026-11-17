<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getDateFieldContext } from "./context.js";
import type { DateInputLiteralProps } from "./types.js";

let { segment, children, ...rest }: DateInputLiteralProps = $props();
const api = getDateFieldContext("DateInputLiteral");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getSegmentProps(segment);
});
</script>

<span {...mergeProps(rest, chrono)}>{#if children}{@render children()}{:else}{segment.text}{/if}</span>
