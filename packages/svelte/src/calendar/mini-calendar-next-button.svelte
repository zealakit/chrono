<script lang="ts">
import MiniCalendarNavButton from "./mini-calendar-nav-button.svelte";
import type { ButtonProps } from "./types.js";

let { children, ...rest }: ButtonProps = $props();
</script>

<MiniCalendarNavButton kind="next" {children} {...rest} />
