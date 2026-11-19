export {
  type CustomViews,
  type ViewDefinition,
  type ViewLayout,
  type ViewLength,
  getBuiltInViews,
  getMonthCount,
  resolveView,
  resolveViews,
} from "./navigation/view-definition.js";
export { getRange, getVisibleRange } from "./navigation/range.js";
export type { RangeContext } from "./navigation/range.js";
export {
  canNavigate,
  firstVisibleDay,
  getDefinition,
  getHiddenDays,
  navigate,
} from "./navigation/navigate.js";
export type {
  NavigationAction,
  NavigationContext,
  NavigationState,
} from "./navigation/navigate.js";
export { getCalendarTitle } from "./navigation/title.js";
export type { CalendarTitle } from "./navigation/title.js";
export type { CalendarDay, DayContext } from "./views/day.js";
export { getMonthLayout } from "./views/month-layout.js";
export type {
  CalendarWeek,
  LayoutContext,
  MonthGridModel,
  MonthLayout,
} from "./views/month-layout.js";
export { getTimeGridLayout } from "./views/time-grid-layout.js";
export type {
  TimeGridLayout,
  TimeGridOptions,
} from "./views/time-grid-layout.js";
export { getListLayout } from "./views/list-layout.js";
export type { ListLayout } from "./views/list-layout.js";
export { getMiniCalendarLayout } from "./views/mini-calendar.js";
export type { MiniCalendarLayoutOptions } from "./views/mini-calendar.js";
export { createCalendarController } from "./controllers/calendar-controller.js";
export type {
  CalendarController,
  CalendarLayout,
  CalendarMessages,
  CalendarOptions,
  CalendarState,
} from "./controllers/calendar-controller.js";
export { createMiniCalendarController } from "./controllers/mini-calendar-controller.js";
export type {
  MiniCalendarController,
  MiniCalendarOptions,
  MiniCalendarState,
  MonthValue,
} from "./controllers/mini-calendar-controller.js";
export type { Modifiers } from "./controllers/shared.js";
export {
  normalizeEvents,
  coveredDays,
  wallSecondsOf,
} from "./events/normalize.js";
export type { NormalizeOptions } from "./events/normalize.js";
export { compareEventIds, compareMonthSegments } from "./events/sort.js";
export type { SortableSegment } from "./events/sort.js";
export { layoutMonthEvents } from "./events/month-layout.js";
export type { MonthLayoutEventsOptions } from "./events/month-layout.js";
export { layoutAllDayRow } from "./events/all-day-row.js";
export type { AllDayRowOptions } from "./events/all-day-row.js";
export { layoutTimeGridEvents } from "./events/time-grid-layout.js";
export type { TimeGridEventsOptions } from "./events/time-grid-layout.js";
export { getNowIndicator } from "./events/now-indicator.js";
export type { NowIndicator, NowIndicatorDay } from "./events/now-indicator.js";
export { layoutAgenda } from "./events/agenda-layout.js";
export type { AgendaDay, AgendaOptions } from "./events/agenda-layout.js";
export { enterCell, isExitKey, stepFocus } from "./interaction/event-focus.js";
export type {
  FocusItems,
  FocusMode,
  FocusState,
} from "./interaction/event-focus.js";
export { computeSelection, selectionPieces } from "./interaction/selection.js";
export type {
  SelectionCell,
  SelectionOptions,
  SelectionRange,
} from "./interaction/selection.js";
export { applyEventLimit, applyPieceLimit } from "./events/overflow.js";
export type { DayOverflow, OverflowResult } from "./events/overflow.js";
export type {
  AgendaItem,
  AllDayRowSegment,
  CalendarEventInput,
  CalendarEvents,
  EventId,
  EventSegmentBase,
  MonthEventLayout,
  MonthSegment,
  NormalizedEvent,
  SelectionProposal,
  TimeGridSegment,
} from "./events/types.js";
export {
  autoScrollSpeed,
  createAutoScroll,
} from "./interaction/auto-scroll.js";
export type { AutoScroll } from "./interaction/auto-scroll.js";
export {
  moveEvent,
  nudgeEvent,
  resizeEvent,
  snapTo,
} from "./interaction/drag-geometry.js";
export type {
  DragTarget,
  EditValue,
  GeometryOptions,
  Grab,
} from "./interaction/drag-geometry.js";
export { editStep, matchShortcut } from "./interaction/drag-keyboard.js";
export type {
  EditKind,
  KeyStep,
  Shortcuts,
} from "./interaction/drag-keyboard.js";
export type { PendingChange } from "./interaction/pending.js";
export type {
  ChangeValue,
  DragState,
  EventChangeProposal,
} from "./controllers/drag-engine.js";

export { resourceViews } from "./resources/views.js";
export { resourceCellKey } from "./resources/keys.js";
export { buildResourceTree } from "./resources/tree.js";
export { layoutResourceTimeGrid } from "./resources/resource-time-grid.js";
export { layoutTimeline } from "./resources/timeline-layout.js";
export { buildTimelineAxis, slotKeyOf } from "./resources/timeline-axis.js";
export { clampWindow } from "./resources/windowing.js";
export { zoomTarget } from "./navigation/zoom.js";
export type {
  ResourceAllDayPiece,
  ResourceBuildContext,
  ResourceColumn,
  ResourceGrouping,
  ResourceGroupHeader,
  ResourceId,
  ResourceInput,
  ResourceLayout,
  ResourceRow,
  ResourceTimeGridLayout,
  ResourceTimeGridPiece,
  ResourceWindowInfo,
  TimelineAxis,
  TimelineHeaderCell,
  TimelineLayout,
  TimelinePiece,
  TimelineRow,
  TimelineSlot,
  TimelineSlotDuration,
  TimelineUnit,
  WindowRange,
} from "./resources/types.js";
export type { ResourcePieceLike } from "./controllers/calendar-controller.js";
export {
  availabilityFromEvents,
  resolveCalendarAvailability,
  wallIso,
} from "./availability.js";
export type {
  AvailabilityContext,
  AvailabilityFromEventsOptions,
  CalendarAvailabilityInput,
} from "./availability.js";
export {
  backgroundAttributes,
  layoutBackgrounds,
  layoutTimelineBackgrounds,
} from "./events/background-layout.js";
export type {
  BackgroundDay,
  BackgroundLayoutOptions,
  BackgroundMode,
  BackgroundPiece,
  BackgroundStatus,
  TimelineBackgroundOptions,
  TimelineBackgroundPiece,
} from "./events/background-layout.js";

export { parseRRule, stringifyRRule } from "./recurrence/rrule.js";
export { expandRecurrence } from "./recurrence/series.js";
export { recurrence } from "./recurrence/pack.js";
export {
  applyRecurrenceChange,
  applyRecurrenceDelete,
} from "./recurrence/apply.js";
export type {
  ApplyRecurrenceOptions,
  RecurrenceChangeResult,
  RecurrenceDeleteResult,
  RecurrenceOverride,
  RecurrenceScope,
} from "./recurrence/apply.js";
export type {
  RRule,
  RRuleByDay,
  RRuleError,
  RRuleErrorCode,
  RRuleFreq,
  RRuleUntil,
  RecurrenceErrorHandler,
  RecurrenceExpandOptions,
  RecurrenceInfo,
  RecurrenceOccurrence,
  RecurrencePack,
} from "./recurrence/types.js";
