<script lang="ts">
import { getDateTimeFieldContext } from "./context.js";
import type { DateTimeTimeZoneProps } from "./types.js";

let { children, ...rest }: DateTimeTimeZoneProps = $props();
const api = getDateTimeFieldContext("DateTimeInputTimeZone");
const s = api.state;
</script>

{#if $s.zoneLabel}<span {...rest}>{#if children}{@render children($s.zoneLabel)}{:else}{$s.zoneLabel}{/if}</span>{/if}
