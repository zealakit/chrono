<script lang="ts">
import { untrack } from "svelte";
import { mergeProps } from "../shared/props.js";
import { setDateFieldContext } from "./context.js";
import DateInputContent from "./date-input-content.svelte";
import type { DateInputProps } from "./types.js";
import { useDateInput } from "./use-date-input.js";

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
  id,
  children,
  ...rest
}: DateInputProps = $props();

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
  onValueChange: (next: import("@zealakit/chrono-core/date").DateValue) => {
    value = next;
    onValueChange?.(next);
  },
});

const api = useDateInput({
  ...(untrack(() => options) as object),
  id: untrack(() => id) ?? uid,
});
setDateFieldContext(api);
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
  {#if children}{@render children($s)}{:else}<DateInputContent />{/if}
  {#each $s.hidden as input (`${input.name}:${input.value}`)}
    <input type="hidden" name={input.name} value={input.value} />
  {/each}
</div>
