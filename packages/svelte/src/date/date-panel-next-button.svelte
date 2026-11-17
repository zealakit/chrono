<script lang="ts">
import DatePanelNavButton from "./date-panel-nav-button.svelte";
import type { DateButtonProps } from "./types.js";

let { children, ...rest }: DateButtonProps = $props();
</script>

<DatePanelNavButton kind="next" {children} {...rest} />
