import {
  type Attributes,
  type DateInput,
  type DateRange,
  type DayOfWeek,
  type Messages,
  type PlainDate,
  type WeekdayHeader,
  addMonths,
  compare,
  createControllable,
  defaultMessages,
  endOfMonth,
  formatDateToParts,
  getTextDirection,
  getWeekInfo,
  isSameDay,
  isSameMonth,
  mergeMessages,
  plainDate,
  resolveLocale,
  startOfMonth,
  toPlainDate,
  today as readToday,
} from "../../foundation/index.js";
import { deepEqual } from "../internal/equal.js";
import type { CalendarTitle } from "../navigation/title.js";
import type { CalendarDay } from "../views/day.js";
import type { MonthLayout } from "../views/month-layout.js";
import { getMiniCalendarLayout } from "../views/mini-calendar.js";
import {
  type Modifiers,
  cellAttributes,
  columnHeaderAttributes,
  isNavKey,
  keyOf,
  moveInMonthGrid,
  nextId,
  weekNumberAttributes,
} from "./shared.js";

export type MonthValue = { year: number; month: number };

export type MiniCalendarOptions = {
  id?: string;
  month?: MonthValue;
  defaultMonth?: MonthValue;
  onMonthChange?: (month: MonthValue) => void;
  /** Follow the main calendar when its date leaves the Mini Calendar's month (C11). */
  syncWith?: { date: PlainDate; visibleRange: DateRange };
  /** For example "has events". */
  isMarked?: (date: PlainDate) => boolean;
  /** Called when a day is clicked or activated with Enter (F2). */
  onNavigate?: (date: PlainDate) => void;
  locale?: string;
  weekStartsOn?: DayOfWeek;
  timeZone?: string;
  now?: number;
  min?: DateInput;
  max?: DateInput;
  weekNumbers?: "iso" | "locale" | false;
  messages?: Partial<Messages>;
  selectedDate?: DateInput;
  highlightedDates?: readonly DateInput[] | ((date: PlainDate) => boolean);
};

export type MiniCalendarState = {
  id: string;
  month: MonthValue;
  title: CalendarTitle;
  today: PlainDate;
  focusedDate: PlainDate;
  layout: MonthLayout;
  canGoPrev: boolean;
  canGoNext: boolean;
  direction: "ltr" | "rtl";
  locale?: string;
  messages: Messages;
};

export type MiniCalendarController = {
  getState(): MiniCalendarState;
  subscribe(listener: (state: MiniCalendarState) => void): () => void;
  setOptions(options: Partial<MiniCalendarOptions>): void;
  prev(): void;
  next(): void;
  goToMonth(month: MonthValue): void;
  focusDate(date: PlainDate): void;
  activateDate(date: PlainDate, source: "pointer" | "keyboard"): void;
  handleKeyDown(key: string, modifiers: Modifiers): boolean;
  getRootAttributes(): Attributes;
  getTitleAttributes(): Attributes;
  getNavAttributes(kind: "prev" | "next"): Attributes;
  getGridAttributes(): Attributes;
  getColumnHeaderAttributes(header: WeekdayHeader): Attributes;
  getCellAttributes(day: CalendarDay): Attributes;
  getWeekNumberAttributes(weekNumber: number): Attributes;
  destroy(): void;
};

const sameMonth = (a: MonthValue, b: MonthValue): boolean =>
  a.year === b.year && a.month === b.month;
const monthOf = (date: PlainDate): MonthValue => ({
  year: date.year,
  month: date.month,
});

export function createMiniCalendarController(
  initial: MiniCalendarOptions = {},
): MiniCalendarController {
  let options = initial;
  const id = initial.id ?? nextId("chrono-mini-calendar");
  const titleId = `${id}-title`;

  const todayNow = (): PlainDate => readToday(options.timeZone, options.now);
  const monthControl = createControllable<MonthValue>({
    value: options.month,
    defaultValue:
      options.defaultMonth ??
      (options.syncWith ? monthOf(options.syncWith.date) : monthOf(todayNow())),
    onChange: (month) => options.onMonthChange?.(month),
    equals: sameMonth,
  });
  let lastSyncDate = options.syncWith?.date;
  let focusedDate = plainDate(
    monthControl.get().year,
    monthControl.get().month,
    1,
  );
  let state: MiniCalendarState;
  const listeners = new Set<(state: MiniCalendarState) => void>();

  const compute = (): MiniCalendarState => {
    const locale =
      options.locale === undefined ? undefined : resolveLocale(options.locale);
    const weekInfo = getWeekInfo(locale);
    const month = monthControl.get();
    const today = todayNow();
    const min =
      options.min === undefined
        ? undefined
        : toPlainDate(options.min, options.timeZone);
    const max =
      options.max === undefined
        ? undefined
        : toPlainDate(options.max, options.timeZone);
    const first = plainDate(month.year, month.month, 1);
    if (!isSameMonth(focusedDate, first)) {
      // Keep the day of month where possible, otherwise the first day.
      focusedDate = plainDate(
        month.year,
        month.month,
        Math.min(focusedDate.day, endOfMonth(first).day),
      );
    }
    const highlighted = options.highlightedDates;
    const keys = Array.isArray(highlighted)
      ? new Set(
          (highlighted as readonly DateInput[]).map((value) =>
            keyOf(toPlainDate(value, options.timeZone)),
          ),
        )
      : undefined;
    return {
      id,
      month,
      title: (() => {
        const parts = formatDateToParts(first, locale, {
          month: "long",
          year: "numeric",
        });
        return { text: parts.map((part) => part.value).join(""), parts };
      })(),
      today,
      focusedDate,
      layout: getMiniCalendarLayout({
        month,
        weekStartsOn: options.weekStartsOn ?? weekInfo.firstDay,
        weekInfo,
        locale,
        today,
        focusedDate,
        highlight: options.syncWith?.visibleRange,
        isMarked: options.isMarked,
        selectedDate:
          options.selectedDate === undefined
            ? undefined
            : toPlainDate(options.selectedDate, options.timeZone),
        isHighlighted:
          typeof highlighted === "function"
            ? (highlighted as (date: PlainDate) => boolean)
            : keys
              ? (date) => keys.has(keyOf(date))
              : undefined,
        min,
        max,
        weekNumbers: options.weekNumbers,
      }),
      canGoPrev: min === undefined || compare(first, min) > 0,
      canGoNext: max === undefined || compare(endOfMonth(first), max) < 0,
      direction: getTextDirection(locale),
      locale,
      messages: mergeMessages(defaultMessages, options.messages),
    };
  };

  const refresh = (): void => {
    const next = compute();
    if (state && deepEqual(state, next)) return;
    state = next;
    for (const listener of [...listeners]) listener(state);
  };
  state = compute();

  const showMonth = (month: MonthValue): void => {
    monthControl.set(month);
    refresh();
  };

  const page = (step: 1 | -1): void => {
    if (step === -1 ? !state.canGoPrev : !state.canGoNext) return;
    focusedDate = addMonths(focusedDate, step);
    showMonth(monthOf(addMonths(startOfMonth(focusedDate), 0)));
  };

  const controller: MiniCalendarController = {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setOptions(next) {
      options = { ...options, ...next };
      monthControl.sync({ value: options.month });
      const sync = options.syncWith;
      if (sync && (!lastSyncDate || !isSameDay(lastSyncDate, sync.date))) {
        lastSyncDate = sync.date;
        if (!sameMonth(monthControl.get(), monthOf(sync.date))) {
          focusedDate = sync.date;
          monthControl.set(monthOf(sync.date));
        }
      }
      refresh();
    },
    prev: () => page(-1),
    next: () => page(1),
    goToMonth(month) {
      focusedDate = plainDate(month.year, month.month, 1);
      showMonth(month);
    },
    focusDate(date) {
      focusedDate = date;
      if (!sameMonth(monthControl.get(), monthOf(date)))
        monthControl.set(monthOf(date));
      refresh();
    },
    activateDate(date, _source) {
      controller.focusDate(date);
      const min =
        options.min === undefined
          ? undefined
          : toPlainDate(options.min, options.timeZone);
      const max =
        options.max === undefined
          ? undefined
          : toPlainDate(options.max, options.timeZone);
      const disabled =
        (min && compare(date, min) < 0) || (max && compare(date, max) > 0);
      if (!disabled) options.onNavigate?.(date);
    },
    handleKeyDown(key, modifiers) {
      if (modifiers.ctrl || modifiers.meta) return false;
      if (key === "Enter") {
        controller.activateDate(state.focusedDate, "keyboard");
        return true;
      }
      if (!isNavKey(key)) return false;
      const min =
        options.min === undefined
          ? undefined
          : toPlainDate(options.min, options.timeZone);
      const max =
        options.max === undefined
          ? undefined
          : toPlainDate(options.max, options.timeZone);
      const weekInfo = getWeekInfo(state.locale);
      controller.focusDate(
        moveInMonthGrid(
          state.focusedDate,
          key,
          modifiers.shift,
          {
            weekStartsOn: options.weekStartsOn ?? weekInfo.firstDay,
            direction: state.direction,
            min,
            max,
            level: "day",
          },
          [],
        ),
      );
      return true;
    },

    getRootAttributes: () => ({
      "data-chrono-mini-calendar": true,
      dir: state.direction,
    }),
    getTitleAttributes: () => ({ id: titleId, "aria-live": "polite" }),
    getNavAttributes(kind) {
      const disabled = kind === "prev" ? !state.canGoPrev : !state.canGoNext;
      return {
        type: "button",
        "aria-label":
          kind === "prev" ? state.messages.previous : state.messages.next,
        "aria-disabled": disabled ? "true" : undefined,
        "data-disabled": disabled,
      };
    },
    getGridAttributes: () => ({ role: "grid", "aria-labelledby": titleId }),
    getColumnHeaderAttributes: columnHeaderAttributes,
    getCellAttributes: (day) => ({
      ...cellAttributes(day, {
        locale: state.locale,
        messages: state.messages,
        extraLabel: day.marked ? state.messages.hasEvents : undefined,
      }),
      "data-in-range": day.inRange,
      "data-marked": day.marked,
    }),
    getWeekNumberAttributes: (weekNumber) =>
      weekNumberAttributes(weekNumber, state.messages),
    destroy() {
      listeners.clear();
    },
  };
  return controller;
}
