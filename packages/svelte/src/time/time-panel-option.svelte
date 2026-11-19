<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getTimePanelContext } from "./context.js";
import type { TimePanelOptionProps } from "./types.js";

let { option, children, ...rest }: TimePanelOptionProps = $props();
const api = getTimePanelContext("TimePanelOption");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getOptionProps(option);
});
const slot = $derived.by(() => {
  void $s;
  return api.controller.getSlot(option.key);
});
</script>

<div {...mergeProps(rest, chrono)}>{#if children}{@render children(option, slot)}{:else}{option.text}{/if}</div>
