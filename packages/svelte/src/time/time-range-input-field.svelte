<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getTimeRangeContext, setTimeFieldContext } from "./context.js";
import TimeInputContent from "./time-input-content.svelte";
import type { TimeRangeInputFieldProps } from "./types.js";

let {
  side,
  children,
  ...rest
}: TimeRangeInputFieldProps & { side: "start" | "end" } = $props();
// svelte-ignore state_referenced_locally
const range = getTimeRangeContext(
  side === "start" ? "TimeRangeInputStart" : "TimeRangeInputEnd",
);
// svelte-ignore state_referenced_locally
const api = range[side];
setTimeFieldContext(api);
const s = api.state;
let root = $state<HTMLElement | null>(null);
$effect(() => {
  api.setRoot(root);
});
const chrono = $derived.by(() => {
  void $s;
  return {
    ...api.getRootProps(),
    role: "group",
    "aria-label": $s.messages[side === "start" ? "startTime" : "endTime"],
  };
});
</script>

<div bind:this={root} {...mergeProps(rest, chrono)}>
  {#if children}{@render children($s)}{:else}<TimeInputContent />{/if}
</div>
