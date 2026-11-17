<script lang="ts">
import { untrack } from "svelte";
import { mergeProps } from "../shared/props.js";
import { setDateTimeRangeContext } from "./context.js";
import DateTimeRangeInputEnd from "./datetime-range-input-end.svelte";
import DateTimeRangeInputStart from "./datetime-range-input-start.svelte";
import type { DateTimeRangeInputProps } from "./types.js";
import { useDateTimeRangeInput } from "./use-datetime-input.js";

let {
  value = $bindable(),
  onValueChange,
  defaultValue,
  onValueCommit,
  mode,
  timeZone,
  valueTimeZone,
  disambiguation,
  granularity,
  hourCycle,
  step,
  min,
  max,
  disablePast,
  isDateDisabled,
  isDateUnavailable,
  isTimeDisabled,
  onInvalidInput,
  name,
  formValue,
  required,
  readOnly,
  disabled,
  locale,
  now,
  messages,
  startName,
  endName,
  minDuration,
  maxDuration,
  id,
  children,
  ...rest
}: DateTimeRangeInputProps = $props();

const uid = $props.id();
const options = $derived({
  value,
  defaultValue,
  onValueCommit,
  mode,
  timeZone,
  valueTimeZone,
  disambiguation,
  granularity,
  hourCycle,
  step,
  min,
  max,
  disablePast,
  isDateDisabled,
  isDateUnavailable,
  isTimeDisabled,
  onInvalidInput,
  name,
  formValue,
  required,
  readOnly,
  disabled,
  locale,
  now,
  messages,
  startName,
  endName,
  minDuration,
  maxDuration,
  onValueChange: (
    next: import("@zealakit/chrono-core/datetime").DateTimeRangeValue,
  ) => {
    value = next;
    onValueChange?.(next);
  },
});

const api = useDateTimeRangeInput({
  ...(untrack(() => options) as object),
  id: untrack(() => id) ?? uid,
});
setDateTimeRangeContext(api);
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
    <DateTimeRangeInputStart />
    <span aria-hidden="true">–</span>
    <DateTimeRangeInputEnd />
  {/if}
  {#each $s.hidden as input (`${input.name}:${input.value}`)}
    <input type="hidden" name={input.name} value={input.value} />
  {/each}
</div>
