<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getCalendarContext } from "./context.js";
import type { TitleProps } from "./types.js";

let { children, ...rest }: TitleProps = $props();
const api = getCalendarContext("CalendarTitle");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getTitleProps();
});
</script>

<h2 {...mergeProps(rest, chrono)}>{#if children}{@render children($s.title)}{:else}{$s.title.text}{/if}</h2>
