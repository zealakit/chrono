// Pure utilities and value helpers re-exported from core. No "use client":
// they stay ordinary functions in Server Components and server actions (plan 04 C13).
export {
  getCalendarTitle,
  getRange,
  getVisibleRange,
  layoutAgenda,
  layoutAllDayRow,
  layoutMonthEvents,
  layoutTimeGridEvents,
  normalizeEvents,
  applyEventLimit,
  getNowIndicator,
} from "@zealakit/chrono-core/calendar";
export type {
  AgendaItem,
  AllDayRowSegment,
  CalendarDay,
  CalendarEventInput,
  CalendarEvents as CalendarEventsValue,
  CalendarLayout,
  CalendarMessages,
  CalendarState,
  CalendarTitle as CalendarTitleValue,
  CustomViews,
  DayOverflow,
  EventId,
  EventSegmentBase,
  ListLayout,
  MiniCalendarOptions,
  MiniCalendarState,
  MonthLayout,
  MonthSegment,
  NormalizedEvent,
  NowIndicator,
  SelectionProposal,
  TimeGridLayout,
  TimeGridOptions,
  TimeGridSegment,
  ViewDefinition,
  CalendarOptions,
} from "@zealakit/chrono-core/calendar";
export {
  fromInclusiveEndDate,
  isSameDay,
  toIsoString,
  toPlainDate,
} from "@zealakit/chrono-core/foundation";
export type {
  Attributes,
  DateInput as DateInputValue,
  DateRange,
  DayOfWeek,
  PlainDate,
} from "@zealakit/chrono-core/foundation";

// Resource views (plan 10). `resourceViews` is plain data; import it to opt in.
export {
  buildResourceTree,
  resourceCellKey,
  resourceViews,
  zoomTarget,
} from "@zealakit/chrono-core/calendar";
export type {
  ResourceAllDayPiece,
  ResourceColumn,
  ResourceGrouping,
  ResourceGroupHeader,
  ResourceId,
  ResourceInput,
  ResourceLayout,
  ResourcePieceLike,
  ResourceRow,
  ResourceTimeGridPiece,
  TimelineAxis,
  TimelineHeaderCell,
  TimelinePiece,
  TimelineRow,
  TimelineSlot,
  WindowRange,
} from "@zealakit/chrono-core/calendar";

// Recurring events (plan 12). `recurrence` is plain data; import it to opt in.
export {
  applyRecurrenceChange,
  applyRecurrenceDelete,
  expandRecurrence,
  parseRRule,
  recurrence,
  stringifyRRule,
} from "@zealakit/chrono-core/calendar";
export type {
  RecurrenceChangeResult,
  RecurrenceDeleteResult,
  RecurrenceInfo,
  RecurrenceOverride,
  RecurrencePack,
  RecurrenceScope,
  RRule,
  RRuleByDay,
  RRuleError,
  RRuleUntil,
} from "@zealakit/chrono-core/calendar";

// Move and resize proposals (plan 09): the types `onEventChange` and `validateEventChange` receive.
export type {
  ChangeValue,
  DragState,
  EditKind,
  EventChangeProposal,
  PendingChange,
} from "@zealakit/chrono-core/calendar";
