import type {
  DateRange,
  PlainDate,
  PlainDateTime,
  PlainTime,
} from "../../foundation/index.js";
import type {
  AllDayRowSegment,
  CalendarEventInput,
  EventId,
  NormalizedEvent,
  TimeGridSegment,
} from "../events/types.js";
import type { RecurrenceInfo } from "../recurrence/types.js";
import type { CalendarDay } from "../views/day.js";

/** A resource id: a string or a number (plan 10 R1). */
export type ResourceId = string | number;

/** What the app passes for one resource; its own fields pass through untouched. */
export type ResourceInput = {
  id: ResourceId;
  /** Tree parent. Missing or unknown parents make the resource a root. */
  parentId?: ResourceId | null;
};

/** A resource in the visible order, with tree state (plan 10 R9). */
export type ResourceRow<T extends ResourceInput = ResourceInput> = {
  /** `String(id)`. */
  key: string;
  id: ResourceId;
  resource: T;
  label: string;
  parentKey: string | null;
  /** Depth, 0 for roots. */
  level: number;
  /** Has children in the tree. */
  group: boolean;
  expanded: boolean;
  /** Index in the visible order. */
  index: number;
};

export type ResourceGrouping = "resource-first" | "date-first";

export type WindowRange = { start: number; end: number };

/** Counts and offsets an app virtualizer can drive (plan 10 R14). */
export type ResourceWindowInfo = {
  totalRows: number;
  totalColumns: number;
  rowOffset: number;
  columnOffset: number;
};

/** One column of the resource time grid: a resource on a day. */
export type ResourceColumn<T extends ResourceInput = ResourceInput> = {
  /** `${resourceKey}@${dayKey}`. */
  key: string;
  resourceKey: string;
  resourceId: ResourceId;
  resource: T;
  label: string;
  day: CalendarDay;
  /** Absolute column index (before windowing). */
  index: number;
};

/** A group header spanning the leaf columns below it. */
export type ResourceGroupHeader<T extends ResourceInput = ResourceInput> = {
  key: string;
  resourceKey: string;
  resource: T;
  label: string;
  level: number;
  startColumn: number;
  colSpan: number;
};

type PieceResource = {
  resourceKey: string;
  resourceId: ResourceId;
};

export type ResourceTimeGridPiece<
  TEvent extends CalendarEventInput = CalendarEventInput,
> = TimeGridSegment<TEvent> &
  PieceResource & {
    columnKey: string;
  };

export type ResourceAllDayPiece<
  TEvent extends CalendarEventInput = CalendarEventInput,
> = AllDayRowSegment<TEvent> &
  PieceResource & {
    columnKey: string;
  };

export type ResourceTimeGridLayout<
  TEvent extends CalendarEventInput = CalendarEventInput,
  TResource extends ResourceInput = ResourceInput,
> = {
  kind: "resource-time-grid";
  grouping: ResourceGrouping;
  /** Leaf resources in the window. */
  rows: ResourceRow<TResource>[];
  columns: ResourceColumn<TResource>[];
  groups: ResourceGroupHeader<TResource>[];
  pieces: ResourceTimeGridPiece<TEvent>[];
  allDay: ResourceAllDayPiece<TEvent>[];
  window: ResourceWindowInfo;
};

export type TimelineUnit = "month" | "week" | "day" | "hour" | "minute";

export type TimelineSlotDuration = {
  minutes?: number;
  days?: number;
  weeks?: number;
};

export type TimelineSlot = {
  index: number;
  /** ISO local date-time, `YYYY-MM-DDTHH:mm`. */
  key: string;
  start: PlainDateTime;
  /** Wall-clock seconds of the start since the axis start. */
  offset: number;
};

export type TimelineHeaderCell = {
  key: string;
  unit: TimelineUnit;
  label: string;
  start: PlainDateTime;
  /** Number of axis slots the cell spans. */
  span: number;
  /** Index of the first slot it spans. */
  startSlot: number;
};

export type TimelineAxis = {
  start: PlainDateTime;
  /** Total length in seconds. */
  length: number;
  slotSeconds: number;
  slots: TimelineSlot[];
  /** Coarser rows first. */
  headerRows: { unit: TimelineUnit; cells: TimelineHeaderCell[] }[];
};

export type TimelinePiece<
  TEvent extends CalendarEventInput = CalendarEventInput,
> = PieceResource & {
  /** `${eventKey}:${resourceKey}`. */
  key: string;
  event: TEvent;
  eventId: EventId;
  start: PlainDateTime;
  end: PlainDateTime;
  allDay: boolean;
  rowKey: string;
  /** Fractions 0–1 of the visible axis. */
  left: number;
  width: number;
  lane: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
  past: boolean;
  recurrence?: RecurrenceInfo<TEvent>;
};

export type TimelineRow<T extends ResourceInput = ResourceInput> =
  ResourceRow<T> & {
    /** Lanes used by the row's pieces, at least 1. */
    lanes: number;
  };

export type TimelineLayout<
  TEvent extends CalendarEventInput = CalendarEventInput,
  TResource extends ResourceInput = ResourceInput,
> = {
  kind: "timeline";
  axis: TimelineAxis;
  rows: TimelineRow<TResource>[];
  pieces: TimelinePiece<TEvent>[];
  /** True when any visible resource is a group (treegrid semantics). */
  grouped: boolean;
  window: ResourceWindowInfo;
};

export type ResourceLayout<
  TEvent extends CalendarEventInput = CalendarEventInput,
  TResource extends ResourceInput = ResourceInput,
> =
  | ResourceTimeGridLayout<TEvent, TResource>
  | TimelineLayout<TEvent, TResource>;

/** Everything a resource layout needs, assembled by the controller. */
export type ResourceBuildContext<
  TEvent extends CalendarEventInput = CalendarEventInput,
  TResource extends ResourceInput = ResourceInput,
> = {
  definition: {
    id: string;
    slot?: TimelineSlotDuration;
    headerRows?: TimelineUnit[];
  };
  range: DateRange;
  /** Visible (not hidden) days of the range. */
  days: CalendarDay[];
  locale: string | undefined;
  now: PlainDateTime;
  events: readonly NormalizedEvent<TEvent>[];
  resources: readonly TResource[];
  collapsed: readonly ResourceId[];
  grouping: ResourceGrouping;
  getLabel?: (resource: TResource) => string;
  resourceWindow?: WindowRange;
  slotWindow?: WindowRange;
  dayStart?: PlainTime;
  dayEnd?: PlainTime;
  minEventDuration?: number;
  longEventsInAllDayRow?: boolean;
};

export type ResourceLayoutBuilder = (
  // biome-ignore lint/suspicious/noExplicitAny: the controller supplies matching generics
  context: ResourceBuildContext<any, any>,
  // biome-ignore lint/suspicious/noExplicitAny: the controller supplies matching generics
) => ResourceLayout<any, any>;

export type { PlainDate };
