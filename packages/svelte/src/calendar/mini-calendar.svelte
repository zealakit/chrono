<script lang="ts">
import { onMount, untrack } from "svelte";
import { mergeProps } from "../shared/props.js";
import { setMiniCalendarContext } from "./context.js";
import type { MiniCalendarProps } from "./types.js";
import { useMiniCalendar } from "./use-mini-calendar.js";

let {
  month = $bindable(),
  defaultMonth,
  onMonthChange,
  syncWith,
  isMarked,
  onNavigate,
  locale,
  weekStartsOn,
  timeZone,
  now,
  min,
  max,
  weekNumbers,
  messages,
  selectedDate,
  highlightedDates,
  id,
  children,
  ...rest
}: MiniCalendarProps = $props();

const uid = $props.id();
const options = $derived({
  month,
  defaultMonth,
  syncWith,
  isMarked,
  onNavigate,
  locale,
  weekStartsOn,
  timeZone,
  now,
  min,
  max,
  weekNumbers,
  messages,
  selectedDate,
  highlightedDates,
  onMonthChange: (next: { year: number; month: number }) => {
    month = next;
    onMonthChange?.(next);
  },
});

const mini = useMiniCalendar({
  ...untrack(() => options),
  id: untrack(() => id) ?? uid,
});
setMiniCalendarContext(mini);
const miniState = mini.state;
let root = $state<HTMLElement | null>(null);

$effect.pre(() => {
  mini.controller.setOptions(options);
});
$effect(() => {
  mini.setRoot(root);
});
onMount(() => undefined);

const chrono = $derived.by(() => {
  void $miniState;
  return mini.getRootProps();
});
</script>

<div bind:this={root} {...mergeProps(rest, chrono)}>{@render children?.()}</div>
