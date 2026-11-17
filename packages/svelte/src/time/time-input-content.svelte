<script lang="ts">
import { getTimeFieldContext } from "./context.js";
import TimeInputLiteral from "./time-input-literal.svelte";
import TimeInputSegment from "./time-input-segment.svelte";
import TimeInputTextField from "./time-input-text-field.svelte";

const api = getTimeFieldContext("TimeInput");
const s = api.state;
</script>

{#if $s.mode === "text"}
  <TimeInputTextField />
{:else}
  {#each $s.segments as segment, index (segment.type === "literal" ? `literal-${index}` : segment.type)}
    {#if segment.type === "literal"}
      <TimeInputLiteral {segment} />
    {:else}
      <TimeInputSegment {segment} />
    {/if}
  {/each}
{/if}
