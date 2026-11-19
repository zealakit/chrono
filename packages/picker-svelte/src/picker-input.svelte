<script lang="ts">
import { getContext } from "svelte";
import { PICKER_KEY, type PickerContext } from "./picker-context.js";
import type { PickerPartProps } from "./types.js";

let { onValueChange, onkeydown, ...rest }: PickerPartProps = $props();
const picker = getContext<PickerContext>(PICKER_KEY);
if (!picker) {
  throw new Error(
    "[chrono-picker-svelte] <Input> must be used inside the picker Root.",
  );
}
const Input = picker.config.Input;

function keydown(event: KeyboardEvent): void {
  (onkeydown as ((e: KeyboardEvent) => void) | undefined)?.(event);
  if (event.defaultPrevented) return;
  if (event.altKey && event.key === "ArrowDown") {
    event.preventDefault();
    picker.setOpen(true, "input-key");
  } else if (event.key === "Escape" && picker.open) {
    event.preventDefault();
    picker.setOpen(false, "escape");
  }
}
</script>

<Input
  {...picker.shared}
  {...rest}
  data-chrono-picker={picker.uid}
  data-chrono-picker-part="field"
  value={picker.value}
  onValueChange={(next: unknown) => {
    picker.setValue(next);
    (onValueChange as ((v: unknown) => void) | undefined)?.(next);
  }}
  onkeydown={keydown}
/>
