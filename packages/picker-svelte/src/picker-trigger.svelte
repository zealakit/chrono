<script lang="ts">
import { PopoverTrigger } from "@zealakit/overlay-svelte";
import { getContext } from "svelte";
import { PICKER_KEY, type PickerContext } from "./picker-context.js";
import type { PickerTriggerProps } from "./types.js";

let { children, ...rest }: PickerTriggerProps = $props();
const picker = getContext<PickerContext>(PICKER_KEY);
if (!picker) {
  throw new Error(
    "[chrono-picker-svelte] <Trigger> must be used inside the picker Root.",
  );
}
</script>

<PopoverTrigger
  aria-haspopup="dialog"
  aria-label={picker.config.label}
  {...rest}
  data-chrono-picker={picker.uid}
  data-chrono-picker-part="trigger"
>
  {@render children?.()}
</PopoverTrigger>
