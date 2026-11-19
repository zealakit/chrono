<script lang="ts">
import { untrack } from "svelte";
import { mergeProps } from "../shared/props.js";
import { setTimeFieldContext } from "./context.js";
import TimeInputContent from "./time-input-content.svelte";
import type { TimeInputProps } from "./types.js";
import { useTimeInput } from "./use-time-input.js";

let {
  value = $bindable(),
  onValueChange,
  defaultValue,
  onValueCommit,
  mode,
  granularity,
  hourCycle,
  step,
  placeholderValue,
  parse,
  format,
  onInvalidInput,
  name,
  required,
  readOnly,
  disabled,
  min,
  max,
  disabledRanges,
  isTimeDisabled,
  isTimeUnavailable,
  locale,
  timeZone,
  now,
  messages,
  id,
  children,
  ...rest
}: TimeInputProps = $props();

const uid = $props.id();
const options = $derived({
  value,
  defaultValue,
  onValueCommit,
  mode,
  granularity,
  hourCycle,
  step,
  placeholderValue,
  parse,
  format,
  onInvalidInput,
  name,
  required,
  readOnly,
  disabled,
  min,
  max,
  disabledRanges,
  isTimeDisabled,
  isTimeUnavailable,
  locale,
  timeZone,
  now,
  messages,
  onValueChange: (next: import("@zealakit/chrono-core/time").TimeValue) => {
    value = next;
    onValueChange?.(next);
  },
});

const api = useTimeInput({
  ...(untrack(() => options) as object),
  id: untrack(() => id) ?? uid,
});
setTimeFieldContext(api);
const s = api.state;
let root = $state<HTMLElement | null>(null);
$effect.pre(() => {
  api.controller.setOptions(options as never);
});
$effect(() => {
  api.setRoot(root);
});
const chrono = $derived.by(() => {
  void $s;
  return api.getRootProps();
});
</script>

<div bind:this={root} {...mergeProps(rest, chrono)}>
  {#if children}{@render children($s)}{:else}<TimeInputContent />{/if}
  {#each $s.hidden as input (`${input.name}:${input.value}`)}
    <input type="hidden" name={input.name} value={input.value} />
  {/each}
</div>
