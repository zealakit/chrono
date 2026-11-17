<script lang="ts">
import { untrack } from "svelte";
import { mergeProps } from "../shared/props.js";
import { setDateTimePanelContext } from "./context.js";
import DateTimePanelDate from "./datetime-panel-date.svelte";
import DateTimeRangePanelEndTime from "./datetime-range-panel-end-time.svelte";
import DateTimeRangePanelStartTime from "./datetime-range-panel-start-time.svelte";
import type { DateTimeRangePanelProps } from "./types.js";
import { useDateTimeRangePanel } from "./use-datetime-panel.js";

let {
  value = $bindable(),
  onValueChange,
  defaultValue,
  onValueCommit,
  timeZone,
  valueTimeZone,
  disambiguation,
  minDuration,
  maxDuration,
  min,
  max,
  disablePast,
  isDateDisabled,
  isDateUnavailable,
  isTimeDisabled,
  date,
  startTime,
  endTime,
  onInvalidRange,
  locale,
  now,
  readOnly,
  disabled,
  autoFocus,
  messages,
  id,
  children,
  ...rest
}: DateTimeRangePanelProps = $props();

const uid = $props.id();
const options = $derived({
  value,
  defaultValue,
  onValueCommit,
  timeZone,
  valueTimeZone,
  disambiguation,
  minDuration,
  maxDuration,
  min,
  max,
  disablePast,
  isDateDisabled,
  isDateUnavailable,
  isTimeDisabled,
  date,
  startTime,
  endTime,
  onInvalidRange,
  locale,
  now,
  readOnly,
  disabled,
  autoFocus,
  messages,
  onValueChange: (
    next: import("@zealakit/chrono-core/datetime").DateTimeRangeValue,
    info?: { adjusted: boolean },
  ) => {
    value = next;
    (onValueChange as ((v: unknown, i?: unknown) => void) | undefined)?.(
      next,
      info,
    );
  },
});

const api = useDateTimeRangePanel({
  ...(untrack(() => options) as object),
  id: untrack(() => id) ?? uid,
});
setDateTimePanelContext(api);
$effect.pre(() => {
  api.controller.setOptions(options as never);
});
const chrono = $derived(api.getRootProps());
</script>

<div {...mergeProps(rest, chrono)}>
  {#if children}{@render children()}{:else}<DateTimePanelDate /><DateTimeRangePanelStartTime /><DateTimeRangePanelEndTime />{/if}
</div>
