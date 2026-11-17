import {
  type Attributes,
  type DateInput,
  type DateRange,
  type DayOfWeek,
  type Messages,
  type PlainDate,
  type TimeSlot,
  type WeekdayHeader,
  type WeekInfo,
  addDays,
  createControllable,
  defaultMessages,
  getTextDirection,
  getWeekInfo,
  isDateInRange,
  isSameDay,
  mergeMessages,
  resolveLocale,
  toIsoString,
  toPlainDate,
  today as readToday,
  dayOfWeek,
} from "../../foundation/index.js";
import { deepEqual } from "../internal/equal.js";
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
  type Modifiers,
  cellAttributes,
  columnHeaderAttributes,
  dayAttributes,
  isNavKey,
  keyOf,
  moveInMonthGrid,
  nextId,
  navAttributes,
  toHighlighter,
  weekNumberAttributes,
} from "./shared.js";

export type CalendarMessages = Messages;
export type CalendarLayout = MonthLayout | TimeGridLayout | ListLayout;

export type CalendarOptions = {
  /** Base for generated ids. Adapters pass a framework id so SSR matches. */
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
  /** Epoch milliseconds. Pass it (with `locale`) so server and client agree. */
  now?: number;
  min?: DateInput;
  max?: DateInput;
  timeGrid?: TimeGridOptions;
  weekNumbers?: "iso" | "locale" | false;
  messages?: Partial<CalendarMessages>;
  /** Presentation only (C16). */
  selectedDate?: DateInput;
  highlightedDates?: readonly DateInput[] | ((date: PlainDate) => boolean);
};

export type CalendarState = {
  id: string;
  view: string;
  views: string[];
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
};

export type CalendarController = {
  getState(): CalendarState;
  subscribe(listener: (state: CalendarState) => void): () => void;
  /** Adapters push the latest props. Equal values do not notify. */
  setOptions(options: Partial<CalendarOptions>): void;
  /** Emit the first `onVisibleRangeChange`. Called by the adapter once it is mounted. */
  start(): void;
  prev(): void;
  next(): void;
  today(): void;
  goTo(date: DateInput): void;
  setView(view: string): void;
  setRange(range: DateRange): void;
  focusDate(date: PlainDate): void;
  activateDate(date: PlainDate, source: "pointer" | "keyboard"): void;
  /** Returns `true` when the key was handled, so adapters call `preventDefault()` only then. */
  handleKeyDown(key: string, modifiers: Modifiers): boolean;
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
  destroy(): void;
};

type Config = {
  locale: string | undefined;
  weekInfo: WeekInfo;
  weekStartsOn: DayOfWeek;
  today: PlainDate;
  nav: NavigationContext;
  messages: Messages;
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

export function createCalendarController(
  initial: CalendarOptions & { lazyStart?: boolean } = {},
): CalendarController {
  const { lazyStart, ...rest } = initial;
  let options: CalendarOptions = rest;
  const id = initial.id ?? nextId("chrono-calendar");
  const titleId = `${id}-title`;

  const readConfig = (): Config => {
    const locale =
      options.locale === undefined ? undefined : resolveLocale(options.locale);
    const weekInfo = getWeekInfo(locale);
    const weekStartsOn = options.weekStartsOn ?? weekInfo.firstDay;
    const today = readToday(options.timeZone, options.now);
    return {
      locale,
      weekInfo,
      weekStartsOn,
      today,
      messages: mergeMessages(defaultMessages, options.messages),
      nav: {
        views: resolveViews(options.views, weekInfo.weekend),
        weekStartsOn,
        hiddenDays: options.hiddenDays ?? [],
        min:
          options.min === undefined
            ? undefined
            : toPlainDate(options.min, options.timeZone),
        max:
          options.max === undefined
            ? undefined
            : toPlainDate(options.max, options.timeZone),
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
        : toPlainDate(options.date, options.timeZone),
    defaultValue:
      options.defaultDate === undefined
        ? config.today
        : toPlainDate(options.defaultDate, options.timeZone),
    onChange: (date) => options.onDateChange?.(date),
    equals: isSameDay,
  });

  let custom: ViewDefinition | undefined;
  let focusedDate = dateControl.get();
  let started = false;
  let lastRange: DateRange | undefined;
  let state: CalendarState;
  const listeners = new Set<(state: CalendarState) => void>();

  const navState = (): NavigationState => ({
    view: custom ? "custom" : viewControl.get(),
    anchor: dateControl.get(),
    focusedDate,
    custom,
  });

  const compute = (): CalendarState => {
    const nav = navState();
    const definition = getDefinition(nav, config.nav);
    const range = getRange(definition, nav.anchor, config.nav);
    const visibleRange = getVisibleRange(definition, range, config.nav);
    const hidden = getHiddenDays(definition, config.nav);
    const scope = definition.layout === "month" ? visibleRange : range;
    if (
      !isDateInRange(focusedDate, scope) ||
      hidden.includes(dayOfWeek(focusedDate))
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
        : toPlainDate(options.selectedDate, options.timeZone);
    const ctx: LayoutContext = {
      definition,
      range,
      visibleRange,
      focusedDate,
      hiddenDays: hidden,
      min: config.nav.min,
      max: config.nav.max,
      selectedDate,
      isHighlighted: toHighlighter(options.highlightedDates, options.timeZone),
      weekStartsOn: config.weekStartsOn,
      weekInfo: config.weekInfo,
      locale: config.locale,
      today: config.today,
      weekNumbers: options.weekNumbers ?? false,
    };
    const layout: CalendarLayout =
      definition.layout === "month"
        ? getMonthLayout(ctx)
        : definition.layout === "time-grid"
          ? getTimeGridLayout(ctx, options.timeGrid)
          : getListLayout(ctx);

    return {
      id,
      view: nav.view,
      views: Object.keys(config.nav.views),
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
    };
  };

  const emitRange = (): void => {
    if (!started) return;
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

  /** Recompute; keep the old snapshot (and stay quiet) when nothing really changed. */
  const refresh = (): void => {
    const next = compute();
    if (state && deepEqual(state, next)) return;
    state = next;
    emitRange();
    for (const listener of [...listeners]) listener(state);
  };

  state = compute();

  const apply = (next: NavigationState): void => {
    custom = next.custom;
    if (!next.custom && next.view !== viewControl.get())
      viewControl.set(next.view);
    if (!isSameDay(next.anchor, dateControl.get()))
      dateControl.set(next.anchor);
    focusedDate = next.focusedDate;
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

  const handleKeyDown = (key: string, modifiers: Modifiers): boolean => {
    if (modifiers.ctrl || modifiers.meta) return false;
    if (key === "Enter") {
      controller.activateDate(state.focusedDate, "keyboard");
      return true;
    }
    if (!isNavKey(key)) return false;
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
      if (edge) moveFocusTo(edge.date);
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
    if (!forward && !backward) return true; // arrows across the other axis are handled, no-op
    const step = forward ? 1 : -1;
    const neighbor = days[index + step];
    if (neighbor) {
      moveFocusTo(neighbor.date);
    } else {
      // Leaving the range navigates, landing on the first or last visible day.
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

  const controller: CalendarController = {
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
      if (next.view !== undefined && next.view !== previousView)
        custom = undefined;
      config = readConfig();
      viewControl.sync({ value: options.view });
      dateControl.sync({
        value:
          options.date === undefined
            ? undefined
            : toPlainDate(options.date, options.timeZone),
      });
      refresh();
    },
    start() {
      if (started) return;
      started = true;
      emitRange();
    },
    prev: () => go("prev"),
    next: () => go("next"),
    today: () => go("today"),
    goTo: (date) => go({ goTo: toPlainDate(date, options.timeZone) }),
    setView: (view) => go({ view }),
    setRange: (range) => go({ range }),
    focusDate(date) {
      if (isDateInRange(date, state.visibleRange)) {
        focusedDate = date;
        refresh();
      } else {
        go({ goTo: date });
      }
    },
    activateDate(date, source) {
      controller.focusDate(date);
      if (!isOutside(date, config.nav.min, config.nav.max))
        options.onDateActivate?.(date, { view: state.view, source });
    },
    handleKeyDown,

    getRootAttributes: () => ({
      "data-chrono-calendar": true,
      "data-view": state.view,
      "data-layout": state.definition.layout,
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
      if (!isCalendarDay(day)) return columnHeaderAttributes(day);
      return dayAttributes(day, "columnheader", {
        locale: config.locale,
        messages: state.messages,
      });
    },
    getCellAttributes: (day) =>
      cellAttributes(day, { locale: config.locale, messages: state.messages }),
    getWeekNumberAttributes: (weekNumber) =>
      weekNumberAttributes(weekNumber, state.messages),
    getTimeGridAttributes: () => ({ role: "grid", "aria-labelledby": titleId }),
    getSlotAttributes: (slot, day) => ({
      "data-slot-start": toIsoString(slot.start),
      "data-working-hours":
        slot.working &&
        (state.layout.kind !== "time-grid" ||
          state.layout.workingDays.includes(day.dayOfWeek)),
    }),
    getAgendaAttributes: () => ({ role: "list", "aria-labelledby": titleId }),
    getAgendaDayAttributes: (day) =>
      dayAttributes(day, "listitem", {
        locale: config.locale,
        messages: state.messages,
      }),
    destroy() {
      listeners.clear();
    },
  };

  if (!lazyStart) controller.start();
  return controller;
}
