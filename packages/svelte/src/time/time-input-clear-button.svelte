<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getTimeFieldContext } from "./context.js";
import type { TimeButtonProps } from "./types.js";

let { children, ...rest }: TimeButtonProps = $props();
const api = getTimeFieldContext("TimeInputClearButton");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getClearButtonProps();
});
</script>

<button {...mergeProps(rest, chrono)}>{#if children}{@render children()}{:else}{chrono["aria-label"]}{/if}</button>
