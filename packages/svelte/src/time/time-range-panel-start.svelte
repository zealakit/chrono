<script lang="ts">
import TimeRangePanelSet from "./time-range-panel-set.svelte";
import type { TimeRangePanelSetProps } from "./types.js";

let { children, ...rest }: TimeRangePanelSetProps = $props();
</script>

<TimeRangePanelSet side="start" {children} {...rest} />
