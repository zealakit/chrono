<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getCalendarContext } from "./context.js";
import type { ButtonProps } from "./types.js";

let {
  kind,
  children,
  ...rest
}: ButtonProps & { kind: "prev" | "next" | "today" } = $props();
const api = getCalendarContext("CalendarNavButton");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getNavProps(kind);
});
</script>

<button {...mergeProps(rest, chrono)}>{#if children}{@render children()}{:else}{chrono["aria-label"]}{/if}</button>
