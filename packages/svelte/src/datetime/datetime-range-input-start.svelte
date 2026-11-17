<script lang="ts">
import DateTimeRangeInputField from "./datetime-range-input-field.svelte";
import type { DateTimeRangeInputFieldProps } from "./types.js";

let { children, ...rest }: DateTimeRangeInputFieldProps = $props();
</script>

<DateTimeRangeInputField side="start" {children} {...rest} />
