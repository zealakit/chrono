<script lang="ts">
import { untrack } from "svelte";
import { mergeProps } from "../shared/props.js";
import { setDateRangeContext } from "./context.js";
import DateRangeInputEnd from "./date-range-input-end.svelte";
import DateRangeInputStart from "./date-range-input-start.svelte";
import type { DateRangeInputProps } from "./types.js";
import { useDateRangeInput } from "./use-date-input.js";

let {
  value = $bindable(),
  onValueChange,
  defaultValue,
  onValueCommit,
  mode,
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
  isDateDisabled,
  isDateUnavailable,
  locale,
  timeZone,
  now,
  messages,
  startName,
  endName,
  minDays,
  maxDays,
  allowUnavailableInside,
  allowDisabledInside,
  id,
  children,
  ...rest
}: DateRangeInputProps = $props();

const uid = $props.id();
const options = $derived({
  value,
  defaultValue,
  onValueCommit,
  mode,
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
  isDateDisabled,
  isDateUnavailable,
  locale,
  timeZone,
  now,
  messages,
  startName,
  endName,
  minDays,
  maxDays,
  allowUnavailableInside,
  allowDisabledInside,
  onValueChange: (
    next: import("@zealakit/chrono-core/date").DateRangeValue,
  ) => {
    value = next;
    onValueChange?.(next);
  },
});

const api = useDateRangeInput({
  ...(untrack(() => options) as object),
  id: untrack(() => id) ?? uid,
});
setDateRangeContext(api);
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
    <DateRangeInputStart />
    <span aria-hidden="true">–</span>
    <DateRangeInputEnd />
  {/if}
  {#each $s.hidden as input (`${input.name}:${input.value}`)}
    <input type="hidden" name={input.name} value={input.value} />
  {/each}
</div>
