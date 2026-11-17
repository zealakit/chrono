<script lang="ts">
import CalendarNavButton from "./calendar-nav-button.svelte";
import type { ButtonProps } from "./types.js";

let { children, ...rest }: ButtonProps = $props();
</script>

<CalendarNavButton kind="today" {children} {...rest} />
