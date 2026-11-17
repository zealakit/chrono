<script lang="ts">
import type { TimePanelGroupLabelProps } from "./types.js";

let { children, ...rest }: TimePanelGroupLabelProps = $props();
</script>

<div {...rest}>{@render children?.()}</div>
