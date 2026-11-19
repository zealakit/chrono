<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getDateFieldContext } from "./context.js";
import type { DateButtonProps } from "./types.js";

let { children, ...rest }: DateButtonProps = $props();
const api = getDateFieldContext("DateInputClearButton");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getClearButtonProps();
});
</script>

<button {...mergeProps(rest, chrono)}>{#if children}{@render children()}{:else}{chrono["aria-label"]}{/if}</button>
