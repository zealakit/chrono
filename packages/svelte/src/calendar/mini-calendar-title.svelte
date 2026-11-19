<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getMiniCalendarContext } from "./context.js";
import type { MiniTitleProps } from "./types.js";

let { children, ...rest }: MiniTitleProps = $props();
const api = getMiniCalendarContext("MiniCalendarTitle");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getTitleProps();
});
</script>

<h2 {...mergeProps(rest, chrono)}>{#if children}{@render children()}{:else}{$s.title.text}{/if}</h2>
