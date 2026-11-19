<script lang="ts">
import { getDateTimeFieldContext } from "./context.js";
import DateTimeInputDateField from "./datetime-input-date-field.svelte";
import DateTimeInputLiteral from "./datetime-input-literal.svelte";
import DateTimeInputSegment from "./datetime-input-segment.svelte";
import DateTimeInputTimeField from "./datetime-input-time-field.svelte";

const api = getDateTimeFieldContext("DateTimeInput");
const s = api.state;
</script>

{#if $s.mode === "text"}
  <DateTimeInputDateField />
  <DateTimeInputTimeField />
{:else}
  {#each $s.segments as segment, index (segment.type === "literal" ? `literal-${index}` : segment.type)}
    {#if segment.type === "literal"}
      <DateTimeInputLiteral {segment} />
    {:else}
      <DateTimeInputSegment {segment} />
    {/if}
  {/each}
{/if}
