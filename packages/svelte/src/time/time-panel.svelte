<script lang="ts">
import { untrack } from "svelte";
import TimePanelRoot from "./time-panel-root.svelte";
import type { TimePanelProps } from "./types.js";
import { useTimePanel } from "./use-time-panel.js";

let {
  value = $bindable(),
  onValueChange,
  defaultValue,
  onValueCommit,
  layout,
  granularity,
  hourCycle,
  step,
  start,
  end,
  slotDuration,
  slots,
  groupBy,
  min,
  max,
  disabledRanges,
  isTimeDisabled,
  isTimeUnavailable,
  scrollToSelected,
  autoFocus,
  readOnly,
  disabled,
  locale,
  timeZone,
  now,
  messages,
  timer,
  id,
  children,
  ...rest
}: TimePanelProps = $props();

const uid = $props.id();
const options = $derived({
  value,
  defaultValue,
  onValueCommit,
  layout,
  granularity,
  hourCycle,
  step,
  start,
  end,
  slotDuration,
  slots,
  groupBy,
  min,
  max,
  disabledRanges,
  isTimeDisabled,
  isTimeUnavailable,
  scrollToSelected,
  autoFocus,
  readOnly,
  disabled,
  locale,
  timeZone,
  now,
  messages,
  timer,
  onValueChange: (next: never, info?: never) => {
    value = next;
    (onValueChange as ((v: unknown, i?: unknown) => void) | undefined)?.(
      next,
      info,
    );
  },
});

const api = useTimePanel({
  ...(untrack(() => options) as object),
  id: untrack(() => id) ?? uid,
});
$effect.pre(() => {
  api.controller.setOptions(options as never);
});
</script>

<TimePanelRoot {api} {rest} {children} />
