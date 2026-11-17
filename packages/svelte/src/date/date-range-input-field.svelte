<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getDateRangeContext, setDateFieldContext } from "./context.js";
import DateInputContent from "./date-input-content.svelte";
import type { DateRangeInputFieldProps } from "./types.js";

let {
  side,
  children,
  ...rest
}: DateRangeInputFieldProps & { side: "start" | "end" } = $props();
// svelte-ignore state_referenced_locally
const range = getDateRangeContext(
  side === "start" ? "DateRangeInputStart" : "DateRangeInputEnd",
);
// svelte-ignore state_referenced_locally
const api = range[side];
setDateFieldContext(api);
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
    "aria-label": $s.messages[side === "start" ? "startDate" : "endDate"],
  };
});
</script>

<div bind:this={root} {...mergeProps(rest, chrono)}>
  {#if children}{@render children($s)}{:else}<DateInputContent />{/if}
</div>
