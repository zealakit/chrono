<script lang="ts">
import { getContext } from "svelte";
import { PICKER_KEY, type PickerContext } from "./picker-context.js";
import type { PickerPartProps } from "./types.js";

let { onValueChange, onValueCommit, ...rest }: PickerPartProps = $props();
const picker = getContext<PickerContext>(PICKER_KEY);
if (!picker) {
  throw new Error(
    "[chrono-picker-svelte] <Panel> must be used inside the picker Root.",
  );
}
const Panel = picker.config.Panel;
</script>

<Panel
  autoFocus
  {...picker.shared}
  {...rest}
  value={picker.value}
  onValueChange={(next: unknown) => {
    picker.setValue(next);
    (onValueChange as ((v: unknown) => void) | undefined)?.(next);
  }}
  onValueCommit={(next: unknown) => {
    (onValueCommit as ((v: unknown) => void) | undefined)?.(next);
    picker.commit(next);
  }}
/>
