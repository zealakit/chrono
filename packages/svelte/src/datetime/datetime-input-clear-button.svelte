<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getDateTimeFieldContext } from "./context.js";
import type { DateTimeButtonProps } from "./types.js";

let { children, ...rest }: DateTimeButtonProps = $props();
const api = getDateTimeFieldContext("DateTimeInputClearButton");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getClearButtonProps();
});
</script>

<button {...mergeProps(rest, chrono)}>{#if children}{@render children()}{:else}{chrono["aria-label"]}{/if}</button>
