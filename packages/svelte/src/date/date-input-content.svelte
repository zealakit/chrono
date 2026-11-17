<script lang="ts">
import { getDateFieldContext } from "./context.js";
import DateInputLiteral from "./date-input-literal.svelte";
import DateInputSegment from "./date-input-segment.svelte";
import DateInputTextField from "./date-input-text-field.svelte";

const api = getDateFieldContext("DateInput");
const s = api.state;
</script>

{#if $s.mode === "text"}
  <DateInputTextField />
{:else}
  {#each $s.segments as segment, index (segment.type === "literal" ? `literal-${index}` : segment.type)}
    {#if segment.type === "literal"}
      <DateInputLiteral {segment} />
    {:else}
      <DateInputSegment {segment} />
    {/if}
  {/each}
{/if}
