import {
  type Attributes,
  type Availability,
  type AvailabilityRule,
  type AvailabilitySpec,
  compileAvailability,
  type DateInput,
  type DateRange,
  type DayOfWeek,
  type Messages,
  type PlainDate,
  type PlainDateTime,
  type TimeSlot,
  type WeekdayHeader,
  type WeekInfo,
  addDays,
  announce,
  createControllable,
  createTicker,
  dayOfWeek,
  defaultMessages,
  formatMessage,
  fromEpochDay,
  fromSecondOfDay,
  getTextDirection,
  getWeekInfo,
  isDateInRange,
  isSameDay,
  mergeMessages,
  nowZoned,
  parseCellKey,
  plainDateTime,
  plainDate,
  resolveLocale,
  toIsoString,
  toPlainDate,
  toPlainDateTime,
  toPlainTime,
  toSecondOfDay,
  today as readToday,
  type Ticker,
} from "../../foundation/index.js";
import {
  type CalendarAvailabilityInput,
  resolveCalendarAvailability,
} from "../availability.js";
import {
  type BackgroundMode,
  type BackgroundPiece,
  type TimelineBackgroundPiece,
  backgroundAttributes,
  layoutBackgrounds,
  layoutTimelineBackgrounds,
} from "../events/background-layout.js";
import { statesEqual } from "../internal/equal.js";
import {
  type NavigationAction,
  type NavigationContext,
  type NavigationState,
  canNavigate,
  firstVisibleDay,
  getDefinition,
  getHiddenDays,
  navigate,
} from "../navigation/navigate.js";
import { getRange, getVisibleRange } from "../navigation/range.js";
import { type CalendarTitle, getCalendarTitle } from "../navigation/title.js";
import {
  type CustomViews,
  type ViewDefinition,
  resolveViews,
} from "../navigation/view-definition.js";
import { type CalendarDay, isOutside } from "../views/day.js";
import { getListLayout, type ListLayout } from "../views/list-layout.js";
import {
  type LayoutContext,
  type MonthLayout,
  getMonthLayout,
} from "../views/month-layout.js";
import {
  type TimeGridLayout,
  type TimeGridOptions,
  getTimeGridLayout,
} from "../views/time-grid-layout.js";
import {
  applyEventLimit,
  layoutAgenda,
  layoutAllDayRow,
  layoutMonthEvents,
  layoutTimeGridEvents,
  normalizeEvents,
  wallSecondsOf,
  type DayOverflow,
} from "../events/index.js";
import type {
  AllDayRowSegment,
  CalendarEventInput,
  CalendarEvents,
  EventId,
  MonthSegment,
  NormalizedEvent,
  SelectionProposal,
  TimeGridSegment,
} from "../events/types.js";
import { getNowIndicator, type NowIndicator } from "../events/now-indicator.js";
import {
  computeSelection,
  selectionPieces,
  type SelectionCell,
  type SelectionRange,
} from "../interaction/selection.js";
import {
  enterCell as enterInteractionCell,
  stepFocus,
  type FocusState,
} from "../interaction/event-focus.js";
import {
  createSelectionPointer,
  type SelectionPointer,
} from "../interaction/pointer.js";
import {
  createDragPointer,
  type DragPointer,
} from "../interaction/drag-pointer.js";
import { warnOnce } from "../events/normalize.js";
import type {
  ResourceId,
  ResourceInput,
  ResourceLayout,
  ResourceColumn,
  ResourceGrouping,
  ResourceGroupHeader,
  TimelineHeaderCell,
  TimelineRow,
  TimelineSlot,
  WindowRange,
} from "../resources/types.js";
import { zoomTarget } from "../navigation/zoom.js";
import { resourceCellKey } from "../resources/keys.js";
import type { PendingChange } from "../interaction/pending.js";
import {
  type DragState,
  type EventChangeProposal,
  createDragEngine,
} from "./drag-engine.js";
import type { HitPoint, HitTarget } from "../interaction/hit-test.js";
import type {
  RecurrenceInfo,
  RecurrencePack,
  RRuleError,
} from "../recurrence/types.js";
import {
  type Modifiers,
  cellAttributes,
  columnHeaderAttributes,
  dayAttributes,
  isNavKey,
  keyOf,
  moveInMonthGrid,
  navAttributes,
  nextId,
  toHighlighter,
  weekNumberAttributes,
} from "./shared.js";

export type CalendarMessages = Messages;

export type CalendarLayout = MonthLayout | TimeGridLayout | ListLayout;

export type CalendarOptions<
  TEvent extends CalendarEventInput = CalendarEventInput,
> = {
  id?: string;
  view?: string;
  defaultView?: string;
  onViewChange?: (view: string) => void;
  date?: DateInput;
  defaultDate?: DateInput;
  onDateChange?: (date: PlainDate) => void;
  onVisibleRangeChange?: (range: DateRange, info: { view: string }) => void;
  onDateActivate?: (
    date: PlainDate,
    info: { view: string; source: "pointer" | "keyboard" },
  ) => void;
  views?: CustomViews;
  locale?: string;
  weekStartsOn?: DayOfWeek;
  hiddenDays?: DayOfWeek[];
  timeZone?: string;
  now?: number;
  min?: DateInput;
  max?: DateInput;
  timeGrid?: TimeGridOptions;
  weekNumbers?: "iso" | "locale" | false;
  messages?: Partial<CalendarMessages>;
  selectedDate?: DateInput;
  highlightedDates?: readonly DateInput[] | ((date: PlainDate) => boolean);
  /** Events to lay out (plan 05 E1). */
  events?: readonly TEvent[];
  /** The opt-in recurrence pack (plan 12 RR2). */
  recurrence?: RecurrencePack;
  onRecurrenceError?: (event: CalendarEventInput, error: RRuleError) => void;
  eventLimit?: number | "auto";
  allDayEventLimit?: number;
  minEventDuration?: number;
  longEventsInAllDayRow?: boolean;
  selectedEventId?: string | number | null;
  defaultSelectedEventId?: string | number | null;
  onSelectedEventChange?: (
    id: string | number | null,
    event: TEvent | null,
  ) => void;
  onEventActivate?: (
    event: TEvent,
    info: { source: "pointer" | "keyboard"; dayKey: string },
  ) => void;
  onMoreActivate?: (date: PlainDate, events: TEvent[]) => void;
  getEventLabel?: (event: TEvent) => string;
  selectable?: boolean;
  maxSelectionDuration?: number;
  selection?: SelectionProposal | null;
  onSelectionChange?: (selection: SelectionProposal | null) => void;
  onSelectRange?: (proposal: SelectionProposal) => void;
  validateSelection?: (proposal: SelectionProposal) => boolean;
  hitTest?: (point: HitPoint) => HitTarget | null;
  announcer?: HTMLElement | false;
  /** Moving and resizing events (plan 09). Off by default. */
  editable?: boolean;
  isEventEditable?: (
    event: TEvent,
    kind: "move" | "resize-start" | "resize-end",
  ) => boolean;
  /** Minutes; default the time grid's slot length. */
  snapDuration?: number;
  allowAllDayConversion?: boolean;
  /** Minutes; default 60. */
  defaultTimedDuration?: number;
  onEventChange?: (
    proposal: EventChangeProposal<TEvent>,
  ) => void | boolean | Promise<boolean>;
  validateEventChange?: (proposal: EventChangeProposal<TEvent>) => boolean;
  /** The availability model (plan 11 V4): a spec, a compiled model, or a function of the drag context. */
  availability?: CalendarAvailabilityInput;
  /** Which background pieces the layout exposes (plan 11 V9); default `"unavailable"`. */
  backgrounds?: BackgroundMode;
  /** Block selection and moves over unavailable time (plan 11 V10); default `true`. */
  availabilityBlocksInteraction?: boolean;
  getResourceAvailability?: (resource: ResourceInput) => AvailabilitySpec;
  getAvailabilityLabel?: (rules: readonly AvailabilityRule[]) => string;
  /** Milliseconds; default 10000. */
  pendingTimeout?: number;
  autoScroll?: boolean;
  scrollContainer?: HTMLElement | null;
  keyboardShortcuts?:
    | { move?: string; resizeEnd?: string; resizeStart?: string }
    | false;
  /** Resources for resource views (plan 10 R1). Pass `resourceViews` as `views` to use them. */
  resources?: readonly ResourceInput[];
  getResourceLabel?: (resource: ResourceInput) => string;
  resourceGrouping?: ResourceGrouping;
  collapsedResourceIds?: readonly ResourceId[];
  defaultCollapsedResourceIds?: readonly ResourceId[];
  onCollapsedResourceIdsChange?: (ids: readonly ResourceId[]) => void;
  /** View ids from finest to coarsest, for `zoomIn` / `zoomOut` (plan 10 R8). */
  zoomLevels?: readonly string[];
  /** Half-open window over the rows (timeline) or leaf columns (time grid). */
  resourceWindow?: WindowRange;
  slotWindow?: WindowRange;
};

export type CalendarState<
  TEvent extends CalendarEventInput = CalendarEventInput,
> = {
  id: string;
  view: string;
  definition: ViewDefinition;
  date: PlainDate;
  focusedDate: PlainDate;
  today: PlainDate;
  range: DateRange;
  visibleRange: DateRange;
  title: CalendarTitle;
  layout: CalendarLayout;
  canGoPrev: boolean;
  canGoNext: boolean;
  direction: "ltr" | "rtl";
  locale?: string;
  hiddenDays: DayOfWeek[];
  messages: CalendarMessages;
  /** The segments of the active layout. */
  events: CalendarEvents<TEvent>;
  /** Per-day overflow (month view). */
  more: DayOverflow<TEvent>[];
  /** The time-grid all-day row (empty outside time-grid views). */
  allDayRow: AllDayRowSegment<TEvent>[];
  nowIndicator: NowIndicator | null;
  selection: SelectionRange | null;
  selectedEventId: string | number | null;
  focus: FocusState;
  /** The active edit and its preview (plan 09 M9), or `null`. */
  drag: DragState<TEvent> | null;
  /** Accepted changes `events` does not show yet (plan 09 M3). */
  pending: PendingChange[];
  /** The resource layout of a resource view (plan 10), else `null`. */
  resources: ResourceLayout<TEvent> | null;
  /** Shaded availability pieces for the active time grid or timeline (plan 11 V9). */
  backgrounds: (BackgroundPiece | TimelineBackgroundPiece)[];
};

/** A piece of a resource view: a resource time grid piece or a timeline piece. */
export type ResourcePieceLike<TEvent extends CalendarEventInput> = {
  key: string;
  event: TEvent;
  resourceKey: string;
  past: boolean;
  continuesBefore: boolean;
  continuesAfter: boolean;
  allDay: boolean;
  lane?: number;
  left?: number;
  width?: number;
  top?: number;
  height?: number;
  column?: number;
  columns?: number;
  span?: number;
  recurrence?: RecurrenceInfo<TEvent>;
};

export type CalendarController<
  TEvent extends CalendarEventInput = CalendarEventInput,
> = {
  getState(): CalendarState<TEvent>;
  subscribe(listener: (state: CalendarState<TEvent>) => void): () => void;
  setOptions(options: Partial<CalendarOptions<TEvent>>): void;
  start(): void;
  prev(): void;
  next(): void;
  today(): void;
  goTo(date: DateInput): void;
  setView(view: string): void;
  setRange(range: DateRange): void;
  focusDate(date: PlainDate): void;
  activateDate(date: PlainDate, source: "pointer" | "keyboard"): void;
  handleKeyDown(key: string, modifiers: Modifiers): boolean;
  selectEvent(id: string | number | null): void;
  activateEvent(key: string, source: "pointer" | "keyboard"): void;
  activateMore(cellKey: string): void;
  enterCell(cellKey: string): void;
  exitCell(): void;
  startSelection(target: SelectionCell, source: "pointer" | "keyboard"): void;
  extendSelection(target: SelectionCell): void;
  confirmSelection(): void;
  cancelSelection(): void;
  clearSelection(): void;
  setEventLimit(limit: number): void;
  startMove(segmentKey: string, source?: "pointer" | "keyboard"): boolean;
  startResize(
    segmentKey: string,
    edge: "start" | "end",
    source?: "pointer" | "keyboard",
  ): boolean;
  updateDrag(target: HitTarget): void;
  dropDrag(): void;
  cancelDrag(): void;
  toggleResource(id: ResourceId): void;
  zoomIn(): void;
  zoomOut(): void;
  getResourceHeaderAttributes(column: ResourceColumn): Attributes;
  getResourceGroupHeaderAttributes(group: ResourceGroupHeader): Attributes;
  getTimelineAttributes(): Attributes;
  getTimelineHeaderCellAttributes(cell: TimelineHeaderCell): Attributes;
  getTimelineRowAttributes(row: TimelineRow): Attributes;
  getTimelineRowHeaderAttributes(row: TimelineRow): Attributes;
  getTimelineCellAttributes(row: TimelineRow, slot: TimelineSlot): Attributes;
  getResourcePieceAttributes(piece: ResourcePieceLike<TEvent>): Attributes;
  getResizeHandleAttributes(
    segment: CalendarEvents<TEvent>[number],
    edge: "start" | "end",
  ): Attributes;
  getDragPreviewAttributes(piece: CalendarEvents<TEvent>[number]): Attributes;
  /** The drag preview pieces hosted by one cell (`allDay`: the all-day row cell). */
  getCellDragPreviewSegments(
    day: { key: string },
    allDay?: boolean,
  ): CalendarEvents<TEvent>[number][];
  /** The raw `eventLimit` option, so adapters can measure when it is `"auto"`. */
  getEventLimit(): number | "auto" | undefined;
  mount(root: HTMLElement | null): void;
  unmount(): void;
  getRootAttributes(): Attributes;
  getTitleAttributes(): Attributes;
  getNavAttributes(kind: "prev" | "next" | "today"): Attributes;
  getViewButtonAttributes(view: string): Attributes;
  getGridAttributes(monthIndex?: number): Attributes;
  getColumnHeaderAttributes(day: CalendarDay | WeekdayHeader): Attributes;
  getCellAttributes(day: CalendarDay): Attributes;
  getWeekNumberAttributes(weekNumber: number): Attributes;
  getTimeGridAttributes(): Attributes;
  getSlotAttributes(slot: TimeSlot, day: CalendarDay): Attributes;
  getAgendaAttributes(): Attributes;
  getAgendaDayAttributes(day: CalendarDay): Attributes;
  getEventAttributes(segment: CalendarEvents<TEvent>[number]): Attributes;
  getCellEventSegments(day: { key: string }): CalendarEvents<TEvent>[number][];
  /** Attribute record for one availability background piece (plan 11 V9). */
  getBackgroundAttributes(
    piece: BackgroundPiece | TimelineBackgroundPiece,
  ): Attributes;
  /** The segment for an event key (adapters map `data-chrono-event-key` back to it). */
  getEventSegment(key: string): CalendarEvents<TEvent>[number] | undefined;
  getMoreAttributes(day: CalendarDay): Attributes;
  getAllDayCellAttributes(day: CalendarDay): Attributes;
  getNowIndicatorAttributes(): Attributes;
  getSelectionPreviewAttributes(day: CalendarDay): Attributes;
  destroy(): void;
};

type Config = {
  locale: string | undefined;
  weekInfo: WeekInfo;
  weekStartsOn: DayOfWeek;
  today: PlainDate;
  nav: NavigationContext;
  messages: Messages;
  timeZone: string;
};

const day1 = (month: { year: number; month: number }): PlainDate => ({
  calendar: "gregory",
  year: month.year,
  month: month.month,
  day: 1,
});

const isCalendarDay = (
  value: CalendarDay | WeekdayHeader,
): value is CalendarDay => "date" in value;

type EventsResult<TEvent extends CalendarEventInput> = {
  events: CalendarEvents<TEvent>;
  more: DayOverflow<TEvent>[];
  allDayRow: AllDayRowSegment<TEvent>[];
  nowIndicator: NowIndicator | null;
};

export function createCalendarController<
  TEvent extends CalendarEventInput = CalendarEventInput,
>(
  initial: CalendarOptions<TEvent> & { lazyStart?: boolean } = {},
): CalendarController<TEvent> {
  const { lazyStart, ...rest } = initial;
  let options: CalendarOptions<TEvent> = rest;
  const id = initial.id ?? nextId("chrono-calendar");
  const titleId = `${id}-title`;

  const readConfig = (): Config => {
    const locale =
      options.locale === undefined ? undefined : resolveLocale(options.locale);
    const weekInfo = getWeekInfo(locale);
    const weekStartsOn = options.weekStartsOn ?? weekInfo.firstDay;
    const timeZone =
      options.timeZone ?? new Intl.DateTimeFormat().resolvedOptions().timeZone;
    const today = readToday(timeZone, options.now);
    return {
      locale,
      weekInfo,
      weekStartsOn,
      today,
      timeZone,
      messages: mergeMessages(defaultMessages, options.messages),
      nav: {
        views: resolveViews(options.views, weekInfo.weekend),
        weekStartsOn,
        hiddenDays: options.hiddenDays ?? [],
        min:
          options.min === undefined
            ? undefined
            : toPlainDate(options.min, timeZone),
        max:
          options.max === undefined
            ? undefined
            : toPlainDate(options.max, timeZone),
        today,
      },
    };
  };

  let config = readConfig();
  const viewControl = createControllable<string>({
    value: options.view,
    defaultValue: options.defaultView ?? "month",
    onChange: (view) => options.onViewChange?.(view),
  });
  const dateControl = createControllable<PlainDate>({
    value:
      options.date === undefined
        ? undefined
        : toPlainDate(options.date, config.timeZone),
    defaultValue:
      options.defaultDate === undefined
        ? config.today
        : toPlainDate(options.defaultDate, config.timeZone),
    onChange: (date) => options.onDateChange?.(date),
    equals: isSameDay,
  });
  const selectedEventControl = createControllable<string | number | null>({
    value:
      options.selectedEventId === undefined
        ? undefined
        : options.selectedEventId,
    defaultValue: options.defaultSelectedEventId ?? null,
    onChange: (selected) =>
      options.onSelectedEventChange?.(selected, eventById(selected)),
  });

  const collapsedControl = createControllable<readonly ResourceId[]>({
    value: options.collapsedResourceIds,
    defaultValue: options.defaultCollapsedResourceIds ?? [],
    onChange: (ids) => options.onCollapsedResourceIdsChange?.(ids),
    equals: (a, b) => a.length === b.length && a.every((id, i) => id === b[i]),
  });

  let custom: ViewDefinition | undefined;
  let focusedDate = dateControl.get();
  let started = false;
  let lastRange: DateRange | undefined;
  let state: CalendarState<TEvent>;
  let nowMs = options.now ?? Date.now();
  let ticker: Ticker | undefined;
  let pointer: SelectionPointer | undefined;
  let dragPointer: DragPointer | undefined;

  let eventLimitOverride: number | undefined;
  let focus: FocusState | undefined;
  const listeners = new Set<(state: CalendarState<TEvent>) => void>();

  // Memoization of the events pipeline (plan 05 R1): unchanged inputs reuse
  // the same arrays, so the state comparer sees equal references.
  let eventsCache:
    | {
        source: readonly TEvent[] | undefined;
        key: string;
        result: EventsResult<TEvent>;
      }
    | undefined;

  const navState = (): NavigationState => ({
    view: custom ? "custom" : viewControl.get(),
    anchor: dateControl.get(),
    focusedDate,
    custom,
  });

  const normalizeFor = (
    source: readonly TEvent[] | undefined,
    visibleRange: DateRange,
  ): NormalizedEvent<TEvent>[] => {
    if (!source) {
      return [];
    }
    return normalizeEvents(source, {
      visibleRange,
      timeZone: config.timeZone,
      recurrence: options.recurrence,
      onRecurrenceError: options.onRecurrenceError,
    });
  };

  const eventsFor = (
    layout: CalendarLayout,
    visibleRange: DateRange,
    now: PlainDateTime,
  ): EventsResult<TEvent> => {
    const source = options.events;
    const timeGrid = options.timeGrid;
    const key = [
      toIsoString(visibleRange.start),
      toIsoString(visibleRange.end),
      config.timeZone,
      layout.kind,
      options.eventLimit ?? eventLimitOverride ?? "auto",
      options.allDayEventLimit ?? 3,
      options.minEventDuration ?? 15,
      options.longEventsInAllDayRow ?? true,
      timeGrid?.start ? toIsoString(toPlainTime(timeGrid.start)) : "",
      timeGrid?.end ? toIsoString(toPlainTime(timeGrid.end)) : "",
      config.nav.hiddenDays.join(","),
      Math.floor(nowMs / 60_000),
      engine.pendingSignature(),
      options.recurrence === undefined ? "" : "recurrence",
    ].join("|");
    if (
      eventsCache &&
      eventsCache.source === source &&
      eventsCache.key === key
    ) {
      return eventsCache.result;
    }
    const normalized = normalizeFor(source, visibleRange).map((event) =>
      engine.override(event),
    );
    const result = buildEvents(layout, normalized, now);
    eventsCache = { source, key, result };
    return result;
  };

  const buildEvents = (
    layout: CalendarLayout,
    normalized: NormalizedEvent<TEvent>[],
    now: PlainDateTime,
  ): EventsResult<TEvent> => {
    if (layout.kind === "month") {
      const segments = layoutMonthEvents(normalized, layout, { now });
      const limit = effectiveLimit();
      const { segments: limited, more } = applyEventLimit(
        segments,
        limit,
        layout,
      );
      return { events: limited, more, allDayRow: [], nowIndicator: null };
    }
    if (layout.kind === "time-grid") {
      const timeGrid = options.timeGrid;
      const dayStart =
        timeGrid?.start === undefined ? undefined : toPlainTime(timeGrid.start);
      const dayEnd =
        timeGrid?.end === undefined ? undefined : toPlainTime(timeGrid.end);
      const { segments } = layoutAllDayRow(normalized, layout.days, {
        eventLimit: options.allDayEventLimit ?? 3,
        longEventsInAllDayRow: options.longEventsInAllDayRow,
        now,
      });
      const events = layoutTimeGridEvents(normalized, layout.days, {
        dayStart,
        dayEnd,
        minEventDuration: options.minEventDuration,
        longEventsInAllDayRow: options.longEventsInAllDayRow,
        now,
      });
      const nowIndicator = getNowIndicator(now, layout.days, {
        dayStart,
        dayEnd,
      });
      return { events, more: [], allDayRow: segments, nowIndicator };
    }
    const days = layoutAgenda(normalized, layout.days, { now });
    return {
      events: days.flatMap((day) => day.items),
      more: [],
      allDayRow: [],
      nowIndicator: null,
    };
  };

  /** `eventLimit: "auto"` measures after mount; before that it falls back to 3 (plan 05 §3.1). */
  const effectiveLimit = (): number | undefined => {
    if (eventLimitOverride !== undefined) {
      return eventLimitOverride;
    }
    const limit = options.eventLimit;
    if (typeof limit === "number") {
      return limit;
    }
    return limit === "auto" ? 3 : undefined;
  };

  const eventById = (eventId: string | number | null): TEvent | null => {
    if (eventId == null) {
      return null;
    }
    return options.events?.find((event) => event.id === eventId) ?? null;
  };

  const nowDateTime = (): PlainDateTime =>
    toPlainDateTime(nowZoned(config.timeZone, nowMs), config.timeZone);

  /** The focus cell key: a day key, or a slot key in a time grid (plan 05 R3). */
  const focusCellKey = (layout: CalendarLayout, date: PlainDate): string => {
    const dayKey = keyOf(date);
    if (layout.kind === "time-grid" && layout.slots[0]) {
      return `${dayKey}T${toIsoString(layout.slots[0].start)}`;
    }
    return dayKey;
  };

  let resourcesCache:
    | {
        events: unknown;
        resources: unknown;
        label: unknown;
        key: string;
        result: ResourceLayout<TEvent>;
      }
    | undefined;
  const resourcesFor = (
    definition: ViewDefinition,
    range: DateRange,
    visibleRange: DateRange,
    layout: Extract<CalendarLayout, { kind: "time-grid" }>,
    now: PlainDateTime,
  ): ResourceLayout<TEvent> => {
    const collapsed = collapsedControl.get();
    const timeGrid = options.timeGrid;
    const key = [
      definition.id,
      toIsoString(range.start),
      toIsoString(range.end),
      config.timeZone,
      config.locale ?? "",
      options.resourceGrouping ?? "resource-first",
      collapsed.map(String).join(","),
      JSON.stringify(options.resourceWindow ?? null),
      JSON.stringify(options.slotWindow ?? null),
      timeGrid?.start ? toIsoString(toPlainTime(timeGrid.start)) : "",
      timeGrid?.end ? toIsoString(toPlainTime(timeGrid.end)) : "",
      options.minEventDuration ?? 15,
      options.longEventsInAllDayRow ?? true,
      config.nav.hiddenDays.join(","),
      Math.floor(nowMs / 60_000),
      engine.pendingSignature(),
      options.recurrence === undefined ? "" : "recurrence",
    ].join("|");
    if (
      resourcesCache &&
      resourcesCache.events === options.events &&
      resourcesCache.resources === options.resources &&
      resourcesCache.label === options.getResourceLabel &&
      resourcesCache.key === key
    ) {
      return resourcesCache.result;
    }
    const normalized = normalizeFor(options.events, visibleRange).map((event) =>
      engine.override(event),
    );
    if (normalized.some((event) => !event.resourceIds?.length)) {
      warnOnce(
        "[chrono] Events without a resourceId are not shown in resource views.",
      );
    }
    const builder = definition.layoutBuilder;
    const result = (builder as NonNullable<typeof builder>)({
      definition,
      range,
      days: layout.days,
      locale: config.locale,
      now,
      events: normalized,
      resources: options.resources ?? [],
      collapsed,
      grouping: options.resourceGrouping ?? "resource-first",
      getLabel: options.getResourceLabel,
      resourceWindow: options.resourceWindow,
      slotWindow: options.slotWindow,
      dayStart:
        timeGrid?.start === undefined ? undefined : toPlainTime(timeGrid.start),
      dayEnd:
        timeGrid?.end === undefined ? undefined : toPlainTime(timeGrid.end),
      minEventDuration: options.minEventDuration,
      longEventsInAllDayRow: options.longEventsInAllDayRow,
    }) as ResourceLayout<TEvent>;
    resourcesCache = {
      events: options.events,
      resources: options.resources,
      label: options.getResourceLabel,
      key,
      result,
    };
    return result;
  };

  const compute = (fix = false): CalendarState<TEvent> => {
    const nav = navState();
    const definition = getDefinition(nav, config.nav);
    const range = getRange(definition, nav.anchor, config.nav);
    const visibleRange = getVisibleRange(definition, range, config.nav);
    const hidden = getHiddenDays(definition, config.nav);
    const scope = definition.layout === "month" ? visibleRange : range;
    if (
      fix &&
      (!isDateInRange(focusedDate, scope) ||
        hidden.includes(dayOfWeek(focusedDate)))
    ) {
      focusedDate =
        isDateInRange(nav.anchor, range) &&
        !hidden.includes(dayOfWeek(nav.anchor))
          ? nav.anchor
          : firstVisibleDay(range, hidden);
    }

    const selectedDate =
      options.selectedDate === undefined
        ? undefined
        : toPlainDate(options.selectedDate, config.timeZone);
    const ctx: LayoutContext = {
      definition,
      range,
      visibleRange,
      focusedDate,
      hiddenDays: hidden,
      min: config.nav.min,
      max: config.nav.max,
      selectedDate,
      isHighlighted: toHighlighter(options.highlightedDates, config.timeZone),
      weekStartsOn: config.weekStartsOn,
      weekInfo: config.weekInfo,
      locale: config.locale,
      today: config.today,
      weekNumbers: options.weekNumbers ?? false,
    };
    // Resource layouts sit on the time-grid layout for days, slots and focus (plan 10 IG1).
    const layout: CalendarLayout =
      definition.layout === "month"
        ? getMonthLayout(ctx)
        : definition.layout === "list"
          ? getListLayout(ctx)
          : getTimeGridLayout(ctx, options.timeGrid);

    const now = nowDateTime();
    const events = eventsFor(layout, visibleRange, now);
    const resources =
      definition.layoutBuilder && layout.kind === "time-grid"
        ? resourcesFor(definition, range, visibleRange, layout, now)
        : null;
    const currentFocus = focus ?? {
      mode: "navigation" as const,
      cellKey: focusCellKey(layout, focusedDate),
    };

    return {
      id,
      view: nav.view,
      definition,
      date: nav.anchor,
      focusedDate,
      today: config.today,
      range,
      visibleRange,
      title: getCalendarTitle(range, definition, config.locale),
      layout,
      canGoPrev: canNavigate(nav, -1, config.nav),
      canGoNext: canNavigate(nav, 1, config.nav),
      direction: getTextDirection(config.locale),
      locale: config.locale,
      hiddenDays: hidden,
      messages: config.messages,
      events: events.events,
      more: events.more,
      allDayRow: events.allDayRow,
      nowIndicator: events.nowIndicator,
      selection: selection ?? null,
      selectedEventId: selectedEventControl.get(),
      focus: currentFocus,
      drag: engine.drag,
      pending: engine.pending,
      resources,
      backgrounds: backgroundsFor(layout, resources, visibleRange),
    };
  };

  const emitRange = (): void => {
    if (!started) {
      return;
    }
    const visible = state.visibleRange;
    if (
      !lastRange ||
      !isSameDay(lastRange.start, visible.start) ||
      !isSameDay(lastRange.end, visible.end)
    ) {
      lastRange = visible;
      options.onVisibleRangeChange?.(visible, { view: state.view });
    }
  };

  const refresh = (fix = false): void => {
    const next = compute(fix);
    if (state && statesEqual(state, next)) {
      return;
    }
    state = next;
    emitRange();
    for (const listener of [...listeners]) {
      listener(state);
    }
  };

  // Selection state (E14/E15). `selection` is the active range (preview or confirmed).
  let selection: SelectionRange | null = null;
  let selectionAnchor: SelectionCell | null = null;
  let selectionSource: "pointer" | "keyboard" = "pointer";

  // Availability (plan 11 V4, R6, R7): compile once per identity, cache the
  // function form for the duration of one drag (its exclude id is constant).
  let dragAvailability:
    | { key: string; value: Availability | undefined }
    | undefined;
  const resolveAvailability = (
    excludeEventId?: EventId,
  ): Availability | undefined => {
    const input = options.availability;
    if (input === undefined) {
      return undefined;
    }
    const compileOptions = {
      timeZone: config.timeZone,
      now: options.now,
    };
    if (typeof input !== "function") {
      return resolveCalendarAvailability(input, {}, compileOptions);
    }
    const key = String(excludeEventId ?? "");
    if (dragAvailability?.key === key) {
      return dragAvailability.value;
    }
    const value = resolveCalendarAvailability(
      input,
      { excludeEventId },
      compileOptions,
    );
    dragAvailability = { key, value };
    return value;
  };
  const selectionCovered = (proposal: SelectionProposal): boolean => {
    if (options.availabilityBlocksInteraction === false) {
      return false;
    }
    const availability = resolveAvailability();
    return availability
      ? !availability.isRangeAvailable(proposal.start, proposal.end)
      : false;
  };

  // Moving and resizing events (plan 09). The engine owns the drag and pending changes.
  let normalizedCache:
    | {
        source: readonly TEvent[] | undefined;
        key: string;
        value: NormalizedEvent<TEvent>[];
      }
    | undefined;
  const normalizedNow = (): NormalizedEvent<TEvent>[] => {
    if (!state) return [];
    const visible = state.visibleRange;
    const key = `${toIsoString(visible.start)}|${toIsoString(visible.end)}|${config.timeZone}`;
    if (
      normalizedCache &&
      normalizedCache.source === options.events &&
      normalizedCache.key === key
    ) {
      return normalizedCache.value;
    }
    const value = normalizeFor(options.events, visible);
    normalizedCache = { source: options.events, key, value };
    return value;
  };
  const dragOptions = (): CalendarOptions<TEvent> => {
    const base = options;
    if (
      base.availabilityBlocksInteraction === false ||
      base.availability === undefined
    ) {
      return base;
    }
    return {
      ...base,
      validateEventChange: (proposal) => {
        const availability = resolveAvailability(proposal.event.id);
        if (
          availability &&
          !availability.isRangeAvailable(proposal.to.start, proposal.to.end)
        ) {
          return false;
        }
        return base.validateEventChange?.(proposal) ?? true;
      },
    };
  };
  const engine = createDragEngine<TEvent>({
    options: dragOptions,
    layoutKind: () => (state ? state.layout.kind : "month"),
    timeZone: () => config.timeZone,
    locale: () => config.locale,
    messages: () => config.messages,
    rtl: () => getTextDirection(config.locale) === "rtl",
    normalized: normalizedNow,
    segmentEvent: (segmentKey) =>
      [
        ...(state.events as CalendarEvents<TEvent>[number][]),
        ...state.allDayRow,
      ].find((segment) => segment.key === segmentKey)?.event,
    segmentNormalized: (segmentKey) => {
      let best: NormalizedEvent<TEvent> | undefined;
      for (const item of normalizedNow()) {
        if (
          (segmentKey === item.key || segmentKey.startsWith(`${item.key}:`)) &&
          (best === undefined || item.key.length > best.key.length)
        ) {
          best = item;
        }
      }
      return best;
    },
    buildPreview: (event) => {
      const built = buildEvents(state.layout, [event], nowDateTime());
      return { events: built.events, allDayRow: built.allDayRow };
    },
    refresh: () => refresh(),
  });

  const SECONDS_PER_DAY = 86400;
  // Availability on cells and slots (plan 11 V7, V12): attributes plus a label suffix.
  const reasonOf = (rules: readonly AvailabilityRule[]): string =>
    options.getAvailabilityLabel
      ? options.getAvailabilityLabel(rules)
      : (rules[0]?.reason ?? "");
  const dayAvailability = (
    date: PlainDate,
  ): { status: "available" | "partial" | "unavailable"; label: string } => {
    const availability = resolveAvailability();
    if (!availability) {
      return { status: "available", label: "" };
    }
    const status = availability.getDayStatus(date);
    if (status !== "unavailable") {
      return { status, label: "" };
    }
    const piece = availability
      .getIntervals(date, addDays(date, 1))
      .find((interval) => interval.status === "unavailable");
    const reason = piece ? reasonOf(piece.rules) : "";
    return {
      status,
      label: reason
        ? `${state.messages.unavailable}: ${reason}`
        : state.messages.unavailable,
    };
  };
  const slotUnavailable = (slot: TimeSlot, day: CalendarDay): boolean => {
    const availability = resolveAvailability();
    if (!availability) {
      return false;
    }
    const end =
      slot.endSecond >= SECONDS_PER_DAY
        ? plainDateTime(addDays(day.date, 1), fromSecondOfDay(0))
        : plainDateTime(day.date, fromSecondOfDay(slot.endSecond));
    return !availability.isRangeAvailable(
      plainDateTime(day.date, slot.start),
      end,
    );
  };

  // Availability backgrounds (plan 11 V9). The array is memoized so
  // `statesEqual` can compare it by reference (rule `data` is app-owned).
  const EMPTY_BACKGROUNDS: (BackgroundPiece | TimelineBackgroundPiece)[] = [];
  let backgroundsCache:
    | { key: string; value: (BackgroundPiece | TimelineBackgroundPiece)[] }
    | undefined;
  const objectIds = new WeakMap<object, number>();
  let objectIdCounter = 0;
  const objectKey = (value: unknown): string => {
    if (value === null || value === undefined) {
      return "";
    }
    if (typeof value === "object" || typeof value === "function") {
      let id = objectIds.get(value as object);
      if (id === undefined) {
        id = ++objectIdCounter;
        objectIds.set(value as object, id);
      }
      return String(id);
    }
    return String(value);
  };
  const wallFromSeconds = (seconds: number): PlainDateTime => {
    const day = Math.floor(seconds / SECONDS_PER_DAY);
    return plainDateTime(
      fromEpochDay(day),
      fromSecondOfDay(seconds - day * SECONDS_PER_DAY),
    );
  };
  const backgroundsFor = (
    layout: CalendarLayout,
    resources: ResourceLayout<TEvent> | null,
    visibleRange: DateRange,
  ): (BackgroundPiece | TimelineBackgroundPiece)[] => {
    const mode = options.backgrounds ?? "unavailable";
    if (mode === false || options.availability === undefined) {
      return EMPTY_BACKGROUNDS;
    }
    const availability = resolveAvailability();
    if (!availability) {
      return EMPTY_BACKGROUNDS;
    }
    const availabilityOf = (resource: ResourceInput): Availability => {
      const spec = options.getResourceAvailability?.(resource);
      return spec
        ? compileAvailability(spec, {
            timeZone: config.timeZone,
            now: options.now,
          })
        : availability;
    };
    const base = [
      toIsoString(visibleRange.start),
      toIsoString(visibleRange.end),
      config.timeZone,
      String(mode),
      objectKey(options.availability),
      objectKey(options.events),
      objectKey(options.getResourceAvailability),
      String(options.now ?? ""),
      layout.kind === "time-grid"
        ? `${layout.slots[0]?.startSecond ?? ""}-${layout.slots[layout.slots.length - 1]?.endSecond ?? ""}`
        : "",
    ].join("|");
    const signature = resources
      ? `${base}|${resources.kind}|${
          resources.kind === "timeline"
            ? resources.rows.map((row) => row.key).join(",")
            : resources.columns.map((column) => column.key).join(",")
        }`
      : `${base}|${layout.kind}|${
          layout.kind === "time-grid"
            ? layout.days.map((day) => day.key).join(",")
            : ""
        }`;
    if (backgroundsCache?.key === signature) {
      return backgroundsCache.value;
    }
    let value: (BackgroundPiece | TimelineBackgroundPiece)[] =
      EMPTY_BACKGROUNDS;
    if (resources?.kind === "timeline") {
      const axis = resources.axis;
      const end = wallFromSeconds(wallSecondsOf(axis.start) + axis.length);
      value = resources.rows.flatMap((row) =>
        layoutTimelineBackgrounds({
          availability: availabilityOf(row.resource),
          timeZone: config.timeZone,
          rows: [
            { key: row.key, resourceId: String(row.id), resourceKey: row.key },
          ],
          start: axis.start,
          end,
          mode,
        }),
      );
    } else if (resources?.kind === "resource-time-grid") {
      const slots = layout.kind === "time-grid" ? layout.slots : [];
      const dayEnd = slots[slots.length - 1]
        ? fromSecondOfDay(
            (slots[slots.length - 1] as { endSecond: number }).endSecond %
              SECONDS_PER_DAY,
          )
        : undefined;
      value = resources.columns.flatMap((column) =>
        layoutBackgrounds({
          availability: availabilityOf(column.resource),
          timeZone: config.timeZone,
          days: [
            {
              date: column.day.date,
              key: column.day.key,
              resourceId: String(column.resourceId),
              resourceKey: column.resourceKey,
            },
          ],
          dayStart: slots[0]?.start,
          dayEnd,
          mode,
        }),
      );
    } else if (layout.kind === "time-grid") {
      const slots = layout.slots;
      value = layoutBackgrounds({
        availability,
        timeZone: config.timeZone,
        days: layout.days.map((day) => ({ date: day.date, key: day.key })),
        dayStart: slots[0]?.start,
        dayEnd: slots[slots.length - 1]
          ? fromSecondOfDay(
              (slots[slots.length - 1] as { endSecond: number }).endSecond %
                SECONDS_PER_DAY,
            )
          : undefined,
        mode,
      });
    }
    backgroundsCache = { key: signature, value };
    return value;
  };

  state = compute(true);

  const apply = (next: NavigationState): void => {
    custom = next.custom;
    focusedDate = next.focusedDate;
    if (!next.custom && next.view !== viewControl.get()) {
      viewControl.set(next.view);
    }
    if (!isSameDay(next.anchor, dateControl.get())) {
      dateControl.set(next.anchor);
    }
    refresh();
  };

  const go = (action: NavigationAction): void =>
    apply(navigate(navState(), action, config.nav));

  const moveFocusTo = (target: PlainDate): void => {
    if (!isDateInRange(target, state.range)) {
      go({ goTo: target });
      return;
    }
    focusedDate = target;
    refresh();
  };

  const visibleDays = (): CalendarDay[] =>
    state.layout.kind === "month" ? [] : state.layout.days;

  const cellItems = (cellKey: string): string[] => {
    const segments = segmentList();
    const keys = segments
      .filter((segment) => segmentCellKey(segment) === cellKey)
      .map((segment) => segment.key);
    const hasMore = state.more.some((m) => m.dayKey === cellKey);
    return hasMore ? [...keys, `more:${cellKey}`] : keys;
  };

  const segmentList = (): CalendarEvents<TEvent>[number][] => {
    const events = state.events;
    if (Array.isArray(events)) {
      return events as CalendarEvents<TEvent>[number][];
    }
    return [];
  };

  const segmentCellKey = (segment: CalendarEvents<TEvent>[number]): string => {
    if ("dayKey" in segment) {
      return segment.dayKey;
    }
    if ("month" in segment) {
      // Month segment: resolve via the layout.
      return monthSegmentCellKey(segment as MonthSegment<TEvent>);
    }
    return "";
  };

  const monthSegmentCellKey = (segment: MonthSegment<TEvent>): string => {
    const layout = state.layout;
    if (layout.kind !== "month") {
      return "";
    }
    const month = layout.months[segment.month];
    const week = month?.weeks[segment.week];
    const day = week?.days.filter((d) => !d.hidden)[segment.startColumn];
    return day?.key ?? "";
  };

  const handleKeyDown = (key: string, modifiers: Modifiers): boolean => {
    if (modifiers.ctrl || modifiers.meta) {
      return false;
    }

    // 0. Keyboard editing of an event (plan 09 M10).
    if (engine.isEditing()) {
      return engine.handleKey(key, modifiers);
    }

    // 1. Active selection preview.
    if (selection) {
      if (key === "Escape") {
        cancelSelection();
        return true;
      }
      if (key === "Enter") {
        confirmSelection();
        return true;
      }
      if (isNavKey(key) && modifiers.shift) {
        extendSelectionKeyboard(key);
        return true;
      }
      return false;
    }

    // 2. Interaction mode (focus on events inside a cell).
    if (state.focus.mode === "interaction") {
      const edit = state.focus.itemKey
        ? engine.shortcut(key, { ...modifiers, alt: false })
        : null;
      if (
        edit &&
        state.focus.itemKey &&
        engine.canEditSegment(state.focus.itemKey, edit)
      ) {
        return engine.start(edit, state.focus.itemKey, "keyboard");
      }
      if (key === " ") {
        const segment = segmentByKey(state.focus.itemKey);
        if (segment) {
          selectEvent(segment.event.id as string | number);
          announce(formatMessage(state.messages.eventSelected, {}));
          return true;
        }
      }
      if (key === "Enter") {
        const itemKey = state.focus.itemKey;
        if (itemKey?.startsWith("more:")) {
          activateMore(state.focus.cellKey);
          return true;
        }
        const segment = segmentByKey(itemKey);
        if (segment) {
          activateEvent(segment.key, "keyboard");
          return true;
        }
      }
      const next = stepFocus(
        state.focus,
        key,
        modifiers,
        cellItems(state.focus.cellKey),
      );
      if (next) {
        focus = next.mode === "navigation" ? undefined : next;
        refresh();
        return true;
      }
      return false;
    }

    // 3. Navigation mode.
    if (key === "Enter") {
      if (modifiers.shift) {
        controller.activateDate(state.focusedDate, "keyboard");
        return true;
      }
      const cellKey = keyOf(state.focusedDate);
      if (cellItems(cellKey).length > 0) {
        enterCellAction(cellKey);
        return true;
      }
      controller.activateDate(state.focusedDate, "keyboard");
      return true;
    }
    if (key === "F2") {
      const cellKey = keyOf(state.focusedDate);
      if (cellItems(cellKey).length > 0) {
        enterCellAction(cellKey);
        return true;
      }
    }
    if (isNavKey(key) && modifiers.shift && options.selectable) {
      startSelection({ date: state.focusedDate }, "keyboard");
      return true;
    }
    if (!isNavKey(key)) {
      return false;
    }

    const rtl = state.direction === "rtl";
    if (state.definition.layout === "month") {
      moveFocusTo(
        moveInMonthGrid(
          state.focusedDate,
          key,
          modifiers.shift,
          {
            weekStartsOn: config.weekStartsOn,
            direction: state.direction,
            min: config.nav.min,
            max: config.nav.max,
            level: "day",
          },
          state.hiddenDays,
        ),
      );
      return true;
    }

    if (key === "PageUp" || key === "PageDown") {
      go(key === "PageUp" ? "prev" : "next");
      return true;
    }
    const days = visibleDays();
    const keys = days.map((day) => day.key);
    const index = keys.indexOf(keyOf(state.focusedDate));
    if (key === "Home" || key === "End") {
      const edge = key === "Home" ? days[0] : days[days.length - 1];
      if (edge) {
        moveFocusTo(edge.date);
      }
      return true;
    }
    const list = state.definition.layout === "list";
    const forward =
      key === "ArrowRight"
        ? !rtl
        : key === "ArrowLeft"
          ? rtl
          : key === "ArrowDown"
            ? list
            : false;
    const backward =
      key === "ArrowLeft"
        ? !rtl
        : key === "ArrowRight"
          ? rtl
          : key === "ArrowUp"
            ? list
            : false;
    if (!forward && !backward) {
      return true;
    }
    const step = forward ? 1 : -1;
    const neighbor = days[index + step];
    if (neighbor) {
      moveFocusTo(neighbor.date);
    } else {
      let candidate = addDays(state.focusedDate, step);
      for (
        let guard = 0;
        guard < 7 && state.hiddenDays.includes(dayOfWeek(candidate));
        guard += 1
      ) {
        candidate = addDays(candidate, step);
      }
      go({ goTo: candidate });
    }
    return true;
  };

  const segmentByKey = (
    itemKey: string | undefined,
  ): CalendarEvents<TEvent>[number] | undefined => {
    if (!itemKey) {
      return undefined;
    }
    return segmentList().find((segment) => segment.key === itemKey);
  };

  const extendSelectionKeyboard = (key: string): void => {
    const days = state.layout.kind === "month" ? [] : state.layout.days;
    const keys = days.map((day) => day.key);
    const index = keys.indexOf(keyOf(state.focusedDate));
    const target =
      days[index + (key === "ArrowLeft" || key === "ArrowUp" ? -1 : 1)];
    if (target) {
      extendSelection({ date: target.date });
    }
  };

  const activateMore = (cellKey: string): void => {
    const overflow = state.more.find((m) => m.dayKey === cellKey);
    if (!overflow) {
      return;
    }
    const date = toPlainDate(cellKey, config.timeZone);
    options.onMoreActivate?.(date, [...overflow.events]);
  };

  const selectionToProposal = (range: SelectionRange): SelectionProposal => ({
    kind: "create",
    start: range.allDay
      ? plainDate(range.start.year, range.start.month, range.start.day)
      : range.start,
    end: range.allDay
      ? plainDate(range.end.year, range.end.month, range.end.day)
      : range.end,
    allDay: range.allDay,
    source: selectionSource,
  });

  const selectEvent = (eventId: string | number | null): void => {
    selectedEventControl.set(eventId);
    refresh();
  };

  const activateEvent = (
    segmentKey: string,
    source: "pointer" | "keyboard",
  ): void => {
    const segment = segmentByKey(segmentKey);
    if (!segment) {
      return;
    }
    options.onEventActivate?.(segment.event, {
      source,
      dayKey: segmentCellKey(segment),
    });
  };

  const enterCellAction = (cellKey: string): void => {
    focus = enterInteractionCell(cellKey, cellItems(cellKey));
    refresh();
  };

  const exitCellAction = (): void => {
    focus = undefined;
    refresh();
  };

  const startSelection = (
    target: SelectionCell,
    source: "pointer" | "keyboard",
  ): void => {
    if (!options.selectable) {
      return;
    }
    selectionSource = source;
    const allDay = state.definition.layout === "month";
    // The anchor is the cell the selection starts on (plan 05 E14).
    selectionAnchor = allDay
      ? { date: target.date }
      : { date: target.date, time: target.time };
    selection = computeSelection(selectionAnchor, target, {
      allDay,
      slotDurationMinutes: options.timeGrid?.step ?? 30,
      maxDurationMinutes: options.maxSelectionDuration,
    });
    refresh();
  };

  const extendSelection = (target: SelectionCell): void => {
    if (!selection || !selectionAnchor) {
      return;
    }
    selection = computeSelection(selectionAnchor, target, {
      allDay: selection.allDay,
      slotDurationMinutes: options.timeGrid?.step ?? 30,
      maxDurationMinutes: options.maxSelectionDuration,
    });
    refresh();
  };

  const confirmSelection = (): void => {
    if (!selection) {
      return;
    }
    const proposal = selectionToProposal(selection);
    if (selectionCovered(proposal)) {
      return;
    }
    if (options.validateSelection && !options.validateSelection(proposal)) {
      return;
    }
    options.onSelectRange?.(proposal);
    options.onSelectionChange?.(proposal);
    announce(
      formatMessage(state.messages.selectionCreated, {
        range: toIsoString(selection.start),
      }),
      options.announcer,
    );
  };

  const cancelSelection = (): void => {
    if (!selection) {
      return;
    }
    selection = null;
    selectionAnchor = null;
    announce(state.messages.selectionCancelled, options.announcer);
    refresh();
  };

  const clearSelection = (): void => {
    selection = null;
    selectionAnchor = null;
    refresh();
  };

  const setEventLimit = (limit: number): void => {
    if (eventLimitOverride === limit) {
      return;
    }
    eventLimitOverride = limit;
    refresh();
  };

  const controller: CalendarController<TEvent> = {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setOptions(next) {
      const previousView = options.view;
      options = { ...options, ...next };
      if (next.view !== undefined && next.view !== previousView) {
        custom = undefined;
      }
      if (next.now !== undefined) {
        nowMs = next.now;
      }
      config = readConfig();
      viewControl.sync({ value: options.view });
      dateControl.sync({
        value:
          options.date === undefined
            ? undefined
            : toPlainDate(options.date, config.timeZone),
      });
      selectedEventControl.sync({ value: options.selectedEventId });
      collapsedControl.sync({ value: options.collapsedResourceIds });
      if (next.events !== undefined) {
        engine.onEventsChanged(normalizedNow());
      }
      refresh(true);
    },
    start() {
      if (started) {
        return;
      }
      started = true;
      emitRange();
    },
    prev: () => go("prev"),
    next: () => go("next"),
    today: () => go("today"),
    toggleResource(id) {
      const current = collapsedControl.get();
      const key = String(id);
      collapsedControl.set(
        current.some((entry) => String(entry) === key)
          ? current.filter((entry) => String(entry) !== key)
          : [...current, id],
      );
      refresh();
    },
    zoomIn() {
      const next = zoomTarget(options.zoomLevels ?? [], state.view, -1);
      if (next) go({ view: next });
    },
    zoomOut() {
      const next = zoomTarget(options.zoomLevels ?? [], state.view, 1);
      if (next) go({ view: next });
    },
    getResourceHeaderAttributes: (column) => ({
      role: "columnheader",
      "aria-label": column.label,
      "data-resource-id": column.resourceKey,
      "data-chrono-key": resourceCellKey(column.day.key, column.resourceKey),
    }),
    getResourceGroupHeaderAttributes: (group) => ({
      role: "columnheader",
      "aria-label": group.label,
      "aria-colspan": group.colSpan,
      "data-resource-id": group.resourceKey,
      "data-resource-group": true,
      "data-level": group.level,
    }),
    getTimelineAttributes: () => ({
      role:
        state.resources?.kind === "timeline" && state.resources.grouped
          ? "treegrid"
          : "grid",
      "aria-rowcount":
        state.resources?.kind === "timeline"
          ? state.resources.window.totalRows +
            state.resources.axis.headerRows.length
          : undefined,
      "aria-colcount":
        state.resources?.kind === "timeline"
          ? state.resources.window.totalColumns
          : undefined,
    }),
    getTimelineHeaderCellAttributes: (cell) => ({
      role: "columnheader",
      "aria-colspan": cell.span,
      "aria-label": cell.label,
      "data-header-level": cell.unit,
    }),
    getTimelineRowAttributes: (row) => {
      const headerRows =
        state.resources?.kind === "timeline"
          ? state.resources.axis.headerRows.length
          : 0;
      return {
        role: "row",
        "aria-level": row.level + 1,
        "aria-expanded": row.group ? String(row.expanded) : undefined,
        "aria-rowindex": row.index + 1 + headerRows,
        "data-resource-id": row.key,
        "data-collapsed": row.group && !row.expanded,
        "--chrono-row-lanes": row.lanes,
      };
    },
    getTimelineRowHeaderAttributes: (row) => ({
      role: "rowheader",
      "aria-label": row.label,
      "data-resource-id": row.key,
      "data-level": row.level,
      "data-resource-group": row.group,
    }),
    getTimelineCellAttributes: (row, slot) => ({
      role: "gridcell",
      "data-chrono-key": resourceCellKey(slot.key, row.key),
      "data-resource-id": row.key,
    }),
    getResourcePieceAttributes: (piece) => ({
      "data-chrono-event": true,
      "data-resource-id": piece.resourceKey,
      "data-past": piece.past,
      "data-continues-before": piece.continuesBefore,
      "data-continues-after": piece.continuesAfter,
      "data-all-day": piece.allDay,
      "data-recurring":
        piece.recurrence !== undefined || piece.event.recurringId !== undefined,
      "data-override": piece.recurrence?.isOverride === true,
      "data-selected": selectedEventControl.get() === piece.event.id,
      "--chrono-event-lane": piece.lane,
      "--chrono-event-left": piece.left,
      "--chrono-event-width": piece.width,
      "--chrono-event-top": piece.top,
      "--chrono-event-height": piece.height,
      "--chrono-event-column": piece.column,
      "--chrono-event-columns": piece.columns,
      "--chrono-event-span": piece.span,
    }),
    goTo: (date) => go({ goTo: toPlainDate(date, config.timeZone) }),
    setView: (view) => go({ view }),
    setRange: (range) => go({ range }),
    focusDate(date) {
      if (isDateInRange(date, state.visibleRange)) {
        focusedDate = date;
        focus = undefined;
        refresh();
      } else {
        go({ goTo: date });
      }
    },
    activateDate(date, source) {
      controller.focusDate(date);
      if (!isOutside(date, config.nav.min, config.nav.max)) {
        options.onDateActivate?.(date, { view: state.view, source });
      }
    },
    handleKeyDown,
    selectEvent,
    activateEvent,
    activateMore,
    enterCell: enterCellAction,
    exitCell: exitCellAction,
    startSelection,
    extendSelection,
    confirmSelection,
    cancelSelection,
    clearSelection,
    setEventLimit,
    getEventLimit: () => options.eventLimit,
    startMove: (segmentKey, source = "pointer") =>
      engine.start("move", segmentKey, source),
    startResize: (segmentKey, edge, source = "pointer") =>
      engine.start(
        edge === "start" ? "resize-start" : "resize-end",
        segmentKey,
        source,
      ),
    updateDrag: (target) => engine.update(target),
    dropDrag: () => engine.drop(),
    cancelDrag: () => engine.cancel(),
    getResizeHandleAttributes: (segment, edge) =>
      engine.resizeHandle(segment.key, edge),
    getDragPreviewAttributes: (piece) => {
      const {
        role: _r,
        tabindex: _t,
        "aria-pressed": _p,
        ...rest
      } = eventAttributes(piece);
      return {
        ...rest,
        "data-chrono-event": undefined,
        "data-chrono-event-key": undefined,
        "data-editable": undefined,
        "data-dragging": undefined,
        "data-pending": undefined,
        "data-focused": undefined,
        "data-selected": undefined,
        "aria-keyshortcuts": undefined,
        "aria-description": undefined,
        "aria-label": undefined,
        "aria-hidden": "true",
        "data-drag-preview": true,
        "data-invalid": state.drag ? !state.drag.valid : false,
      };
    },
    mount(root) {
      if (options.now === undefined && root && !ticker) {
        ticker = createTicker((now) => {
          nowMs = now;
          refresh();
        });
        ticker.start(nowMs);
      }
      if (options.editable && root && !dragPointer) {
        dragPointer = createDragPointer(root, {
          canStart: (kind, key) => engine.canEditSegment(key, kind),
          begin: (kind, key, target) =>
            engine.start(kind, key, "pointer", target),
          update: (target) => engine.update(target),
          drop: () => engine.drop(),
          cancel: () => engine.cancel(),
          hitTest: options.hitTest,
          scroll: () =>
            options.autoScroll === false
              ? false
              : (options.scrollContainer ?? null),
        });
      }
      if (options.selectable && root && !pointer) {
        pointer = createSelectionPointer(root, {
          ignore: (event) =>
            !!options.editable &&
            !!(event.target as Element | null)?.closest?.(
              "[data-chrono-event-key]",
            ),
          start: (target) => startSelectionFromKey(target),
          extend: (target) => extendSelectionFromKey(target),
          confirm: confirmSelection,
          cancel: cancelSelection,
          hitTest: options.hitTest,
        });
      }
    },
    unmount() {
      ticker?.stop();
      ticker = undefined;
      pointer?.destroy();
      pointer = undefined;
      dragPointer?.destroy();
      dragPointer = undefined;
    },

    getRootAttributes: () => ({
      "data-chrono-calendar": true,
      "data-view": state.view,
      "data-layout": state.definition.layout,
      "data-dragging": state.drag !== null,
      dir: state.direction,
    }),
    getTitleAttributes: () => ({ id: titleId, "aria-live": "polite" }),
    getNavAttributes: (kind) =>
      navAttributes(
        kind === "prev"
          ? state.messages.previous
          : kind === "next"
            ? state.messages.next
            : state.messages.goToToday,
        kind === "prev"
          ? !state.canGoPrev
          : kind === "next"
            ? !state.canGoNext
            : false,
      ),
    getViewButtonAttributes: (view) => ({
      type: "button",
      "aria-pressed": state.view === view ? "true" : "false",
      "data-view": view,
    }),
    getGridAttributes(monthIndex = 0) {
      const months = state.layout.kind === "month" ? state.layout.months : [];
      const month = months[monthIndex];
      if (months.length > 1 && month) {
        return {
          role: "grid",
          "aria-label": getCalendarTitle(
            { start: day1(month), end: day1(month) },
            state.definition,
            config.locale,
          ).text,
        };
      }
      return { role: "grid", "aria-labelledby": titleId };
    },
    getColumnHeaderAttributes(day) {
      if (!isCalendarDay(day)) {
        return columnHeaderAttributes(day);
      }
      // E13: day headers are no longer the focusable row; drop focus + key.
      const attributes = dayAttributes(day, "columnheader", {
        locale: config.locale,
        messages: state.messages,
      });
      delete attributes.tabindex;
      delete attributes["data-chrono-key"];
      return attributes;
    },
    getCellAttributes: (day) => {
      const { status, label } = dayAvailability(day.date);
      return {
        ...cellAttributes(day, {
          locale: config.locale,
          messages: state.messages,
          extraLabel: label || undefined,
        }),
        "data-unavailable": status === "unavailable",
        "data-partially-available": status === "partial",
      };
    },
    getWeekNumberAttributes: (weekNumber) =>
      weekNumberAttributes(weekNumber, state.messages),
    getTimeGridAttributes: () => ({
      role: "grid",
      "aria-labelledby": titleId,
      "aria-rowcount":
        state.layout.kind === "time-grid"
          ? state.layout.slots.length
          : undefined,
      "aria-colcount":
        state.layout.kind === "time-grid"
          ? state.layout.days.length
          : undefined,
    }),
    getSlotAttributes: (slot, day) => {
      const slotKey = `${day.key}T${toIsoString(slot.start)}`;
      const focused = state.focus.cellKey === slotKey;
      return {
        role: "gridcell",
        tabindex: focused ? 0 : -1,
        "data-chrono-key": slotKey,
        "data-slot-start": toIsoString(slot.start),
        "data-unavailable": slotUnavailable(slot, day),
        "data-working-hours":
          slot.working &&
          (state.layout.kind !== "time-grid" ||
            state.layout.workingDays.includes(day.dayOfWeek)),
        "data-selecting":
          state.selection !== null && state.layout.kind === "time-grid",
        "data-has-events": slotHasEvents(slot, day),
      };
    },
    getAgendaAttributes: () => ({ role: "list", "aria-labelledby": titleId }),
    getAgendaDayAttributes: (day) => {
      const { status, label } = dayAvailability(day.date);
      return {
        ...dayAttributes(day, "listitem", {
          locale: config.locale,
          messages: state.messages,
          extraLabel: label || undefined,
        }),
        "data-unavailable": status === "unavailable",
        "data-partially-available": status === "partial",
      };
    },
    getEventAttributes: (segment) => eventAttributes(segment),
    getCellEventSegments: (day) =>
      segmentList().filter((segment) => segmentCellKey(segment) === day.key),
    getBackgroundAttributes: (piece) => backgroundAttributes(piece),
    getCellDragPreviewSegments: (day, allDay = false) => {
      const preview = state.drag?.preview;
      if (!preview) {
        return [];
      }
      const pieces = (
        allDay ? preview.allDayRow : preview.events
      ) as CalendarEvents<TEvent>[number][];
      return Array.isArray(pieces)
        ? pieces.filter((piece) => segmentCellKey(piece) === day.key)
        : [];
    },
    getEventSegment: (key) => segmentByKey(key),
    getMoreAttributes: (day) => {
      const overflow = state.more.find((m) => m.dayKey === day.key);
      return {
        type: "button",
        "aria-label": formatMessage(state.messages.moreEvents, {
          count: overflow?.count ?? 0,
        }),
        "data-overflow": overflow !== undefined,
        "data-chrono-key": day.key,
      };
    },
    getAllDayCellAttributes: (day) => ({
      "data-chrono-key": day.key,
      "data-all-day-cell": true,
      "data-has-events": state.allDayRow.some((s) => segmentCovers(s, day.key)),
    }),
    getNowIndicatorAttributes: () =>
      state.nowIndicator
        ? {
            "aria-hidden": "true",
            "data-now": true,
            "--chrono-now-top": state.nowIndicator.top,
          }
        : {},
    getSelectionPreviewAttributes: (day) => {
      if (!state.selection) {
        return {};
      }
      const pieces = selectionPieces(state.selection);
      const piece = pieces.find((p) => toIsoString(p.date) === day.key);
      if (!piece) {
        return {};
      }
      return {
        "aria-hidden": "true",
        "data-selection": true,
        "data-invalid": selectionInvalid(),
        "data-continues-before": piece.continuesBefore,
        "data-continues-after": piece.continuesAfter,
        "--chrono-event-top": topOf(piece.start),
        "--chrono-event-height": heightOf(piece.start, piece.end),
      };
    },
    destroy() {
      controller.unmount();
      engine.dispose();
      listeners.clear();
    },
  };

  const slotHasEvents = (slot: TimeSlot, day: CalendarDay): boolean => {
    if (state.layout.kind !== "time-grid") {
      return false;
    }
    const start = toSecondOfDay(slot.start);
    const end = slot.endSecond;
    return (state.events as TimeGridSegment<TEvent>[]).some(
      (segment) =>
        segment.dayKey === day.key &&
        toSecondOfDay(segment.start) < end &&
        start < toSecondOfDay(segment.end),
    );
  };

  const segmentCovers = (
    segment: AllDayRowSegment<TEvent>,
    dayKey: string,
  ): boolean => {
    if (state.layout.kind !== "time-grid") {
      return false;
    }
    const start = state.layout.days.findIndex((d) => d.key === segment.dayKey);
    const target = state.layout.days.findIndex((d) => d.key === dayKey);
    return start >= 0 && target >= start && target < start + segment.days;
  };

  const selectionInvalid = (): boolean => {
    if (!state.selection) {
      return false;
    }
    const proposal = selectionToProposal(state.selection);
    if (selectionCovered(proposal)) {
      return true;
    }
    return options.validateSelection
      ? !options.validateSelection(proposal)
      : false;
  };

  const axisStart = (): number =>
    state.layout.kind === "time-grid" && state.layout.slots[0]
      ? toSecondOfDay(state.layout.slots[0].start)
      : 0;
  const axisEnd = (): number =>
    state.layout.kind === "time-grid" &&
    state.layout.slots[state.layout.slots.length - 1]
      ? (state.layout.slots[state.layout.slots.length - 1] as TimeSlot)
          .endSecond
      : 86400;

  const topOf = (value: PlainDateTime): number =>
    (toSecondOfDay(value) - axisStart()) / (axisEnd() - axisStart());

  const heightOf = (start: PlainDateTime, end: PlainDateTime): number =>
    (toSecondOfDay(end) - toSecondOfDay(start)) / (axisEnd() - axisStart());

  const eventAttributes = (
    segment: CalendarEvents<TEvent>[number],
  ): Attributes => {
    const base: Attributes = {
      role: "button",
      "aria-pressed":
        selectedEventControl.get() === segment.event.id ? "true" : "false",
      tabindex:
        state.focus.mode === "interaction" &&
        state.focus.itemKey === segment.key
          ? 0
          : -1,
      "data-chrono-event": true,
      "data-chrono-event-key": segment.key,
      "data-calendar-id": segment.event.calendarId,
      "data-selected": selectedEventControl.get() === segment.event.id,
      "data-focused":
        state.focus.mode === "interaction" &&
        state.focus.itemKey === segment.key,
      "data-all-day": segment.allDay,
      "data-continues-before": segment.continuesBefore,
      "data-continues-after": segment.continuesAfter,
      "data-past": segment.past,
      "data-recurring":
        segment.recurrence !== undefined ||
        segment.event.recurringId !== undefined,
      "data-override": segment.recurrence?.isOverride === true,
    };
    Object.assign(base, engine.attributes(segment.key));
    const label = options.getEventLabel?.(segment.event);
    const recurring = segment.recurrence ? state.messages.recurring : "";
    if (label !== undefined) {
      base["aria-label"] = recurring ? `${label}, ${recurring}` : label;
    } else if (recurring) {
      base["aria-label"] = recurring;
    }
    if ("top" in segment) {
      base["--chrono-event-top"] = segment.top;
      base["--chrono-event-height"] = segment.height;
      base["--chrono-event-column"] = segment.column;
      base["--chrono-event-columns"] = segment.columns;
      base["--chrono-event-span"] = segment.span;
    } else if ("startColumn" in segment) {
      base["--chrono-event-start"] = segment.startColumn;
      base["--chrono-event-days"] = segment.days;
      base["--chrono-event-lane"] = segment.lane;
    }
    return base;
  };

  const startSelectionFromKey = (target: HitTarget): void => {
    startSelection(parseCellKey(target.cellKey), "pointer");
  };

  const extendSelectionFromKey = (target: HitTarget): void => {
    extendSelection(parseCellKey(target.cellKey));
  };

  if (!lazyStart) {
    controller.start();
  }
  return controller;
}
