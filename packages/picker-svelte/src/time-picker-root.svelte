<script lang="ts">
import PickerRoot from "./picker-root.svelte";
import { timePickerConfig } from "./configs.js";
import type { PickerRootProps } from "./types.js";

let {
  value = $bindable(),
  open = $bindable(),
  children,
  ...rest
}: PickerRootProps<unknown> = $props();
</script>

<PickerRoot config={timePickerConfig} bind:value bind:open {...rest}>{@render children?.()}</PickerRoot>
