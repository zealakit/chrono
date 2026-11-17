<script lang="ts">
import { untrack } from "svelte";
import DatePanelRoot from "./date-panel-root.svelte";
import type { DateRangePanelProps } from "./types.js";
import { useDateRangePanel } from "./use-date-panel.js";

let {
  value = $bindable(),
  defaultValue,
  onValueChange,
  onValueCommit,
  visibleMonth = $bindable(),
  defaultVisibleMonth,
  onVisibleMonthChange,
  level = $bindable(),
  defaultLevel,
  onLevelChange,
  minLevel,
  maxLevel,
  months = 2,
  pageBy,
  followValue,
  autoFocus,
  min,
  max,
  isDateDisabled,
  isDateUnavailable,
  locale,
  weekStartsOn,
  timeZone,
  now,
  weekNumbers,
  readOnly,
  disabled,
  messages,
  selectToday,
  onRangePreviewChange,
  onInvalidRange,
  minDays,
  maxDays,
  allowUnavailableInside,
  allowDisabledInside,
  id,
  children,
  ...rest
}: DateRangePanelProps = $props();

const uid = $props.id();
const options = $derived({
  value,
  defaultValue,
  onValueCommit,
  visibleMonth,
  defaultVisibleMonth,
  level,
  defaultLevel,
  minLevel,
  maxLevel,
  months,
  pageBy,
  followValue,
  autoFocus,
  min,
  max,
  isDateDisabled,
  isDateUnavailable,
  locale,
  weekStartsOn,
  timeZone,
  now,
  weekNumbers,
  readOnly,
  disabled,
  messages,
  selectToday,
  onRangePreviewChange,
  onInvalidRange,
  minDays,
  maxDays,
  allowUnavailableInside,
  allowDisabledInside,
  onValueChange: (next: never) => {
    value = next;
    (onValueChange as ((v: unknown) => void) | undefined)?.(next);
  },
  onVisibleMonthChange: (next: { year: number; month: number }) => {
    visibleMonth = next;
    onVisibleMonthChange?.(next);
  },
  onLevelChange: (next: "day" | "month" | "year") => {
    level = next;
    onLevelChange?.(next);
  },
});

const api = useDateRangePanel({
  ...(untrack(() => options) as object),
  id: untrack(() => id) ?? uid,
});
$effect.pre(() => {
  api.controller.setOptions(options as never);
});
</script>

<DatePanelRoot {api} {rest} {children} />
