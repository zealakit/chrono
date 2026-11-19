<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getDateFieldContext } from "./context.js";
import type { DateInputTextFieldProps } from "./types.js";

let { ...rest }: DateInputTextFieldProps = $props();
const api = getDateFieldContext("DateInputTextField");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getTextFieldProps();
});
</script>

<input {...mergeProps(rest, chrono)} />
