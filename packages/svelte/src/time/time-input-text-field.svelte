<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getTimeFieldContext } from "./context.js";
import type { TimeInputTextFieldProps } from "./types.js";

let { ...rest }: TimeInputTextFieldProps = $props();
const api = getTimeFieldContext("TimeInputTextField");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getTextFieldProps();
});
</script>

<input {...mergeProps(rest, chrono)} />
