<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { setTimePanelContext } from "./context.js";
import TimePanelContent from "./time-panel-content.svelte";
import type { TimePanelApi } from "./use-time-panel.js";

let {
  api,
  rest,
  children,
}: {
  api: TimePanelApi;
  rest: Record<string, unknown>;
  children?: import("svelte").Snippet;
} = $props();

// svelte-ignore state_referenced_locally
setTimePanelContext(api);
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

<div bind:this={root} {...mergeProps(rest, chrono)}>{#if children}{@render children()}{:else}<TimePanelContent />{/if}</div>
