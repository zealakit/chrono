<script lang="ts">
import { untrack } from "svelte";
import DatePanelRoot from "./date-panel-root.svelte";
import type { MultiDatePanelProps } from "./types.js";
import { useMultiDatePanel } from "./use-date-panel.js";

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
  maxSelected,
  id,
  children,
  ...rest
}: MultiDatePanelProps = $props();

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
  maxSelected,
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

const api = useMultiDatePanel({
  ...(untrack(() => options) as object),
  id: untrack(() => id) ?? uid,
});
$effect.pre(() => {
  api.controller.setOptions(options as never);
});
</script>

<DatePanelRoot {api} {rest} {children} />
