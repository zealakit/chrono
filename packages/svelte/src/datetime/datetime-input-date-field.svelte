<script lang="ts">
import { mergeProps } from "../shared/props.js";
import { getDateTimeFieldContext } from "./context.js";
import type { DateTimeInputFieldProps } from "./types.js";

let { ...rest }: DateTimeInputFieldProps = $props();
const api = getDateTimeFieldContext("DateTimeInputDateField");
const s = api.state;
const chrono = $derived.by(() => {
  void $s;
  return api.getDateFieldProps();
});
</script>

<input {...mergeProps(rest, chrono)} />
