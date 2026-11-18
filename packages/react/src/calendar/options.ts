import type {
  CalendarOptions,
  MiniCalendarOptions,
} from "@zealakit/chrono-core/calendar";

const CALENDAR_KEYS = [
  "view",
  "defaultView",
  "onViewChange",
  "date",
  "defaultDate",
  "onDateChange",
  "onVisibleRangeChange",
  "onDateActivate",
  "views",
  "locale",
  "weekStartsOn",
  "hiddenDays",
  "timeZone",
  "now",
  "min",
  "max",
  "timeGrid",
  "weekNumbers",
  "messages",
  "selectedDate",
  "highlightedDates",
  "events",
  "eventLimit",
  "allDayEventLimit",
  "minEventDuration",
  "longEventsInAllDayRow",
  "selectedEventId",
  "defaultSelectedEventId",
  "onSelectedEventChange",
  "onEventActivate",
  "onMoreActivate",
  "getEventLabel",
  "selectable",
  "maxSelectionDuration",
  "selection",
  "onSelectionChange",
  "onSelectRange",
  "validateSelection",
  "hitTest",
  "announcer",
  "editable",
  "isEventEditable",
  "snapDuration",
  "allowAllDayConversion",
  "defaultTimedDuration",
  "onEventChange",
  "validateEventChange",
  "pendingTimeout",
  "autoScroll",
  "scrollContainer",
  "keyboardShortcuts",
  "resources",
  "getResourceLabel",
  "resourceGrouping",
  "collapsedResourceIds",
  "defaultCollapsedResourceIds",
  "onCollapsedResourceIdsChange",
  "zoomLevels",
  "resourceWindow",
  "slotWindow",
  "availability",
  "backgrounds",
  "availabilityBlocksInteraction",
  "getResourceAvailability",
  "getAvailabilityLabel",
] as const satisfies readonly (keyof CalendarOptions)[];

const MINI_KEYS = [
  "month",
  "defaultMonth",
  "onMonthChange",
  "syncWith",
  "isMarked",
  "onNavigate",
  "locale",
  "weekStartsOn",
  "timeZone",
  "now",
  "min",
  "max",
  "weekNumbers",
  "messages",
  "selectedDate",
  "highlightedDates",
] as const satisfies readonly (keyof MiniCalendarOptions)[];

function split<O extends object, P extends object>(
  props: P,
  keys: readonly string[],
): [O, Record<string, unknown>] {
  const options: Record<string, unknown> = {};
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    (keys.includes(key) ? options : rest)[key] = value;
  }
  return [options as O, rest];
}

/** Separate the calendar options from the element props a part receives. */
export const splitCalendarProps = (props: object) =>
  split<CalendarOptions, object>(props, CALENDAR_KEYS);

export const splitMiniCalendarProps = (props: object) =>
  split<MiniCalendarOptions, object>(props, MINI_KEYS);
