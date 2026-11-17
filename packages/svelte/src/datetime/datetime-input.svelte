<script lang="ts">
import { untrack } from "svelte";
import { mergeProps } from "../shared/props.js";
import { setDateTimeFieldContext } from "./context.js";
import DateTimeInputContent from "./datetime-input-content.svelte";
import type { DateTimeInputProps } from "./types.js";
import { useDateTimeInput } from "./use-datetime-input.js";

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
  id,
  children,
  ...rest
}: DateTimeInputProps = $props();

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
  onValueChange: (
    next: import("@zealakit/chrono-core/datetime").DateTimeValue,
    info: { adjusted: boolean },
  ) => {
    value = next;
    onValueChange?.(next, info);
  },
});

const api = useDateTimeInput({
  ...(untrack(() => options) as object),
  id: untrack(() => id) ?? uid,
});
setDateTimeFieldContext(api);
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
  {#if children}{@render children($s)}{:else}<DateTimeInputContent />{/if}
  {#each $s.hidden as input (`${input.name}:${input.value}`)}
    <input type="hidden" name={input.name} value={input.value} />
  {/each}
</div>
