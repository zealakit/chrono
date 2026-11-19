<script lang="ts">
import { untrack } from "svelte";
import { mergeProps } from "../shared/props.js";
import { setDateTimePanelContext } from "./context.js";
import DateTimePanelDate from "./datetime-panel-date.svelte";
import DateTimePanelTime from "./datetime-panel-time.svelte";
import type { DateTimePanelProps } from "./types.js";
import { useDateTimePanel } from "./use-datetime-panel.js";

let {
  value = $bindable(),
  onValueChange,
  defaultValue,
  onValueCommit,
  timeZone,
  valueTimeZone,
  disambiguation,
  defaultTime,
  min,
  max,
  disablePast,
  isDateDisabled,
  isDateUnavailable,
  isTimeDisabled,
  isTimeUnavailable,
  date,
  time,
  locale,
  now,
  readOnly,
  disabled,
  autoFocus,
  messages,
  id,
  children,
  ...rest
}: DateTimePanelProps = $props();

const uid = $props.id();
const options = $derived({
  value,
  defaultValue,
  onValueCommit,
  timeZone,
  valueTimeZone,
  disambiguation,
  defaultTime,
  min,
  max,
  disablePast,
  isDateDisabled,
  isDateUnavailable,
  isTimeDisabled,
  isTimeUnavailable,
  date,
  time,
  locale,
  now,
  readOnly,
  disabled,
  autoFocus,
  messages,
  onValueChange: (
    next: import("@zealakit/chrono-core/datetime").DateTimeValue,
    info?: { adjusted: boolean },
  ) => {
    value = next;
    (onValueChange as ((v: unknown, i?: unknown) => void) | undefined)?.(
      next,
      info,
    );
  },
});

const api = useDateTimePanel({
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
  {#if children}{@render children()}{:else}<DateTimePanelDate /><DateTimePanelTime />{/if}
</div>
