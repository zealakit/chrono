<script lang="ts">
import DateRangeInputField from "./date-range-input-field.svelte";
import type { DateRangeInputFieldProps } from "./types.js";

let { children, ...rest }: DateRangeInputFieldProps = $props();
</script>

<DateRangeInputField side="start" {children} {...rest} />
