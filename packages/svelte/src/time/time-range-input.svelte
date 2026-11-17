<script lang="ts">
import { untrack } from "svelte";
import { mergeProps } from "../shared/props.js";
import { setTimeRangeContext } from "./context.js";
import TimeRangeInputEnd from "./time-range-input-end.svelte";
import TimeRangeInputStart from "./time-range-input-start.svelte";
import type { TimeRangeInputProps } from "./types.js";
import { useTimeRangeInput } from "./use-time-input.js";

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
  startName,
  endName,
  allowOvernight,
  minDuration,
  maxDuration,
  id,
  children,
  ...rest
}: TimeRangeInputProps = $props();

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
  startName,
  endName,
  allowOvernight,
  minDuration,
  maxDuration,
  onValueChange: (
    next: import("@zealakit/chrono-core/time").TimeRangeValue,
  ) => {
    value = next;
    onValueChange?.(next);
  },
});

const api = useTimeRangeInput({
  ...(untrack(() => options) as object),
  id: untrack(() => id) ?? uid,
});
setTimeRangeContext(api);
const s = api.state;
$effect.pre(() => {
  api.controller.setOptions(options as never);
});
const chrono = $derived.by(() => {
  void $s;
  return api.getRootProps();
});
</script>

<div {...mergeProps(rest, chrono)}>
  {#if children}{@render children()}{:else}
    <TimeRangeInputStart />
    <span aria-hidden="true">–</span>
    <TimeRangeInputEnd />
  {/if}
  {#each $s.hidden as input (`${input.name}:${input.value}`)}
    <input type="hidden" name={input.name} value={input.value} />
  {/each}
</div>
