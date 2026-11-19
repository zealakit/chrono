<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getDateTimeRangeContext, setDateTimeFieldContext } from "./context.js";
import DateTimeInputContent from "./datetime-input-content.svelte";
import type { DateTimeRangeInputFieldProps } from "./types.js";

let {
  side,
  children,
  ...rest
}: DateTimeRangeInputFieldProps & { side: "start" | "end" } = $props();
// svelte-ignore state_referenced_locally
const range = getDateTimeRangeContext(
  side === "start" ? "DateTimeRangeInputStart" : "DateTimeRangeInputEnd",
);
// svelte-ignore state_referenced_locally
const api = range[side];
setDateTimeFieldContext(api);
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
    "aria-label":
      $s.messages[side === "start" ? "startDateTime" : "endDateTime"],
  };
});
</script>

<div bind:this={root} {...mergeProps(rest, chrono)}>
  {#if children}{@render children($s)}{:else}<DateTimeInputContent />{/if}
</div>
