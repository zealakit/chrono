<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { setDatePanelContext } from "./context.js";
import DatePanelContent from "./date-panel-content.svelte";
import type { DatePanelApi } from "./use-date-panel.js";

let {
  api,
  rest,
  children,
}: {
  api: DatePanelApi;
  rest: Record<string, unknown>;
  children?: import("svelte").Snippet;
} = $props();

// svelte-ignore state_referenced_locally
setDatePanelContext(api);
// svelte-ignore state_referenced_locally
const s = api.state;
let root = $state<HTMLElement | null>(null);
$effect(() => {
  api.setRoot(root);
});
const chrono = $derived.by(() => {
  void $s;
  return api.getRootProps();
});
</script>

<div bind:this={root} {...mergeProps(rest, chrono)}>{#if children}{@render children()}{:else}<DatePanelContent />{/if}</div>
