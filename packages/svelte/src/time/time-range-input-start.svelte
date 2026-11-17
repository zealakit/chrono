<script lang="ts">
import TimeRangeInputField from "./time-range-input-field.svelte";
import type { TimeRangeInputFieldProps } from "./types.js";

let { children, ...rest }: TimeRangeInputFieldProps = $props();
</script>

<TimeRangeInputField side="start" {children} {...rest} />
