<script lang="ts">
import type { CalendarEventInput } from "@zealakit/chrono-core/calendar";
import { untrack } from "svelte";
import { mergeProps } from "../shared/props.js";
import { setCalendarContext } from "./context.js";
import type { CalendarProps } from "./types.js";
import { useCalendar } from "./use-calendar.js";

let {
  view = $bindable(),
  date = $bindable(),
  defaultView,
  defaultDate,
  onViewChange,
  onDateChange,
  onVisibleRangeChange,
  onDateActivate,
  views,
  locale,
  weekStartsOn,
  hiddenDays,
  timeZone,
  now,
  min,
  max,
  timeGrid,
  weekNumbers,
  messages,
  selectedDate,
  highlightedDates,
  events,
  eventLimit,
  allDayEventLimit,
  minEventDuration,
  longEventsInAllDayRow,
  selectedEventId = $bindable(),
  defaultSelectedEventId,
  onSelectedEventChange,
  onEventActivate,
  onMoreActivate,
  getEventLabel,
  selectable,
  maxSelectionDuration,
  validateSelection,
  hitTest,
  announcer,
  editable,
  isEventEditable,
  snapDuration,
  allowAllDayConversion,
  defaultTimedDuration,
  onEventChange,
  validateEventChange,
  pendingTimeout,
  autoScroll,
  scrollContainer,
  keyboardShortcuts,
  id,
  children,
  ...rest
}: CalendarProps = $props();

const uid = $props.id();
const options = $derived({
  view,
  date,
  defaultView,
  defaultDate,
  views,
  locale,
  weekStartsOn,
  hiddenDays,
  timeZone,
  now,
  min,
  max,
  timeGrid,
  weekNumbers,
  messages,
  selectedDate,
  highlightedDates,
  events,
  eventLimit,
  allDayEventLimit,
  minEventDuration,
  longEventsInAllDayRow,
  selectedEventId,
  defaultSelectedEventId,
  getEventLabel,
  selectable,
  maxSelectionDuration,
  validateSelection,
  hitTest,
  announcer,
  editable,
  isEventEditable,
  snapDuration,
  allowAllDayConversion,
  defaultTimedDuration,
  onEventChange,
  validateEventChange,
  pendingTimeout,
  autoScroll,
  scrollContainer,
  keyboardShortcuts,
  onEventActivate,
  onMoreActivate,
  onViewChange: (next: string) => {
    view = next;
    onViewChange?.(next);
  },
  onDateChange: (
    next: import("@zealakit/chrono-core/foundation").PlainDate,
  ) => {
    date = next;
    onDateChange?.(next);
  },
  onVisibleRangeChange,
  onDateActivate,
  onSelectedEventChange: (
    id: string | number | null,
    event: CalendarEventInput | null,
  ) => {
    selectedEventId = id as string | null;
    onSelectedEventChange?.(id, event);
  },
});

const calendar = useCalendar({
  ...untrack(() => options),
  id: untrack(() => id) ?? uid,
});
setCalendarContext(calendar);
const calendarState = calendar.state;
let root = $state<HTMLElement | null>(null);

$effect.pre(() => {
  calendar.controller.setOptions(options);
});
$effect(() => {
  calendar.setRoot(root);
  if (!root) return;
  calendar.controller.start();
  calendar.controller.mount(root);
  return () => calendar.controller.unmount();
});

const chrono = $derived.by(() => {
  void $calendarState;
  return calendar.getRootProps();
});
</script>

<div bind:this={root} {...mergeProps(rest, chrono)}>{@render children?.()}</div>
