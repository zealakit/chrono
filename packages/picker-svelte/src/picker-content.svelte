<script lang="ts">
import { PopoverContent } from "@zealakit/overlay-svelte";
import { getContext } from "svelte";
import PickerPanel from "./picker-panel.svelte";
import { PICKER_KEY, type PickerContext } from "./picker-context.js";
import type { PickerContentProps } from "./types.js";

let { children, onkeydown, ...rest }: PickerContentProps = $props();
const picker = getContext<PickerContext>(PICKER_KEY);
if (!picker) {
  throw new Error(
    "[chrono-picker-svelte] <Content> must be used inside the picker Root.",
  );
}

function keydown(event: KeyboardEvent): void {
  (onkeydown as ((e: KeyboardEvent) => void) | undefined)?.(event);
  // The panel consumes Escape while a range preview is active (P13).
  if (event.key === "Escape" && !event.defaultPrevented) {
    event.preventDefault();
    picker.setOpen(false, "escape");
  }
}
</script>

<PopoverContent
  role="dialog"
  aria-label={picker.config.label}
  {...rest}
  data-chrono-picker={picker.uid}
  data-chrono-picker-part="content"
  onkeydown={keydown}
>
  <!-- Overlay keeps the popup mounted while closed; the panel mounts on open so autoFocus runs each time. -->
  {#if picker.open}
    {#if children}
      {@render children()}
    {:else}
      <PickerPanel />
    {/if}
  {/if}
</PopoverContent>
