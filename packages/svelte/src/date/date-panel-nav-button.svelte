<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getDatePanelContext } from "./context.js";
import type { DateButtonProps } from "./types.js";

let { kind, children, ...rest }: DateButtonProps & { kind: "prev" | "next" } =
  $props();
const api = getDatePanelContext("DatePanelNavButton");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getNavProps(kind);
});
</script>

<button {...mergeProps(rest, chrono)}>{#if children}{@render children()}{:else}{chrono["aria-label"]}{/if}</button>
