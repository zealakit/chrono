<script lang="ts">
import { getDatePanelContext } from "./context.js";
import DatePanelGrid from "./date-panel-grid.svelte";
import DatePanelNextButton from "./date-panel-next-button.svelte";
import DatePanelPrevButton from "./date-panel-prev-button.svelte";
import DatePanelTitle from "./date-panel-title.svelte";

const api = getDatePanelContext("DatePanel");
const s = api.state;
const count = $derived($s.level === "day" ? $s.months.length : 1);
</script>

<DatePanelPrevButton />
<DatePanelTitle />
<DatePanelNextButton />
{#each Array.from({ length: count }, (_, index) => index) as index (index)}
  <DatePanelGrid month={index} />
{/each}
