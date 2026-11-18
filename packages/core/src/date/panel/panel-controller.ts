import {
  type Attributes,
  type Availability,
  type AvailabilitySpec,
  type DateConstraints,
  type DateInput,
  type DateRange,
  type DayOfWeek,
  type Messages,
  type PlainDate,
  type WeekdayHeader,
  addDays,
  addMonths,
  addYears,
  compare,
  compileAvailability,
  createControllable,
  createId,
  daysInMonth,
  defaultMessages,
  endOfMonth,
  formatDate,
  formatDateRange,
  getDateLabel,
  getDateStatus,
  getMonthNames,
  getMonths,
  getTextDirection,
  getWeekInfo,
  getWeekdayHeaders,
  isSameDay,
  mergeMessages,
  nextFocusedDate,
  plainDate,
  plainDateTime,
  plainTime,
  resolveLocale,
  startOfMonth,
  toIsoString,
  toPlainDate,
  today as readToday,
} from "../../foundation/index.js";
import {
  type PickConstraints,
  type RangeReason,
  isBlocked,
  pickRange,
  previewRange,
} from "../selection/range.js";
import { addBetween, toggleDate } from "../selection/multiple.js";
import type {
  DateRangeValue,
  DateValue,
  MultiDateValue,
  PanelLevel,
} from "../types.js";

export type PanelModifiers = { shift: boolean; ctrl: boolean; meta: boolean };
export type PanelMonthValue = { year: number; month: number };
export type PanelKind = "single" | "range" | "multi";

type Range = { start: PlainDate; end: PlainDate };

export type DatePanelBaseOptions = {
  id?: string;
  visibleMonth?: PanelMonthValue;
  defaultVisibleMonth?: PanelMonthValue;
  onVisibleMonthChange?: (month: PanelMonthValue) => void;
  level?: PanelLevel;
  defaultLevel?: PanelLevel;
  onLevelChange?: (level: PanelLevel) => void;
  minLevel?: PanelLevel;
  maxLevel?: PanelLevel;
  /** Months shown side by side. */
  months?: number;
  pageBy?: "month" | "visible";
  /** Show the month of a value that changes from outside (default true). */
  followValue?: boolean;
  autoFocus?: boolean;
  min?: DateInput;
  max?: DateInput;
  isDateDisabled?: (date: PlainDate) => boolean;
  isDateUnavailable?: (date: PlainDate) => boolean;
  /** Availability model (plan 11 V7): fully unavailable days are not selectable, partial days are. */
  availability?: AvailabilitySpec | Availability;
  locale?: string;
  weekStartsOn?: DayOfWeek;
  timeZone?: string;
  now?: number;
  weekNumbers?: "iso" | "locale" | false;
  readOnly?: boolean;
  disabled?: boolean;
  messages?: Partial<Messages>;
  /** `today()` also picks today (single panel). */
  selectToday?: boolean;
};

export type DatePanelOptions = DatePanelBaseOptions & {
  value?: DateValue;
  defaultValue?: DateValue;
  onValueChange?: (value: DateValue) => void;
  onValueCommit?: (value: PlainDate) => void;
};

export type DateRangePanelOptions = DatePanelBaseOptions & {
  value?: DateRangeValue;
  defaultValue?: DateRangeValue;
  onValueChange?: (value: DateRangeValue) => void;
  onValueCommit?: (value: DateRange) => void;
  onRangePreviewChange?: (preview: DateRange | null) => void;
  onInvalidRange?: (reason: RangeReason) => void;
  minDays?: number | ((start: PlainDate) => number);
  maxDays?: number | ((start: PlainDate) => number);
  allowUnavailableInside?: boolean;
  allowDisabledInside?: boolean;
};

export type MultiDatePanelOptions = DatePanelBaseOptions & {
  value?: MultiDateValue;
  defaultValue?: MultiDateValue;
  onValueChange?: (value: MultiDateValue) => void;
  onValueCommit?: (value: MultiDateValue) => void;
  maxSelected?: number;
};

export type PanelDay = {
  date: PlainDate;
  key: string;
  hidden: boolean;
  outsideMonth: boolean;
  today: boolean;
  weekend: boolean;
  selected: boolean;
  disabled: boolean;
  unavailable: boolean;
  partiallyAvailable: boolean;
  blocked: boolean;
  focused: boolean;
  rangeStart: boolean;
  rangeEnd: boolean;
  inRange: boolean;
  preview: boolean;
};

export type PanelMonth = {
  key: string;
  title: string;
  weeks: { weekNumber: number; days: PanelDay[] }[];
};

/** A month (key `2026-11`) or year (key `2026`) cell of the upper levels. */
export type PanelCell = {
  key: string;
  year: number;
  month: number;
  label: string;
  text: string;
  selected: boolean;
  disabled: boolean;
  focused: boolean;
  current: boolean;
  outside: boolean;
};

export type PanelState = {
  id: string;
  kind: PanelKind;
  level: PanelLevel;
  value: DateValue | DateRangeValue | MultiDateValue;
  draft: boolean;
  preview: Range | null;
  visibleMonth: PanelMonthValue;
  title: string;
  today: PlainDate;
  focusedDate: PlainDate;
  weekdays: WeekdayHeader[];
  weekNumbers: boolean;
  months: PanelMonth[];
  cells: PanelCell[];
  canGoPrev: boolean;
  canGoNext: boolean;
  canGoUp: boolean;
  readOnly: boolean;
  disabled: boolean;
  autoFocus: boolean;
  direction: "ltr" | "rtl";
  locale?: string;
  messages: Messages;
  /** Number of selected dates (multi) or days in the range. */
  count: number;
};

const LEVELS: readonly PanelLevel[] = ["day", "month", "year"];
const NAV_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown",
]);

const sameMonth = (a: PanelMonthValue, b: PanelMonthValue): boolean =>
  a.year === b.year && a.month === b.month;
const monthOf = (date: PlainDate): PanelMonthValue => ({
  year: date.year,
  month: date.month,
});
const sameNullable = (a: PlainDate | null, b: PlainDate | null): boolean =>
  a === b || (a !== null && b !== null && isSameDay(a, b));
const sameRangeValue = (a: DateRangeValue, b: DateRangeValue): boolean =>
  a === b ||
  (a !== null &&
    b !== null &&
    sameNullable(a.start, b.start) &&
    sameNullable(a.end, b.end));
const sameMulti = (a: MultiDateValue, b: MultiDateValue): boolean =>
  a.length === b.length &&
  a.every((date, index) => isSameDay(date, b[index] as PlainDate));
const isDraft = (value: DateRangeValue): boolean =>
  value !== null && value.start !== null && value.end === null;

export type PanelController<V, O> = {
  getState(): PanelState;
  subscribe(listener: (state: PanelState) => void): () => void;
  setOptions(options: Partial<O>): void;
  /** Controllers are generic over the value type only for the typed `getValue`. */
  getValue(): V;
  pick(date: PlainDate, source: "pointer" | "keyboard"): void;
  /** Multi: add every selectable day from the last toggled day. */
  extendTo(date: PlainDate): void;
  setPreview(date: PlainDate | null): void;
  cancelDraft(): void;
  clear(): void;
  commit(): void;
  today(): void;
  prev(): void;
  next(): void;
  setLevel(level: PanelLevel): void;
  focusDate(date: PlainDate): void;
  handleKeyDown(key: string, modifiers: PanelModifiers): boolean;
  getRootAttributes(): Attributes;
  getTitleAttributes(): Attributes;
  getLevelButtonAttributes(): Attributes;
  getNavAttributes(kind: "prev" | "next"): Attributes;
  getTodayButtonAttributes(): Attributes;
  getGridAttributes(): Attributes;
  getColumnHeaderAttributes(header: WeekdayHeader): Attributes;
  getWeekNumberAttributes(weekNumber: number): Attributes;
  getCellAttributes(day: PanelDay): Attributes;
  getLevelCellAttributes(cell: PanelCell): Attributes;
  destroy(): void;
};

type AnyOptions = DatePanelBaseOptions & {
  value?: unknown;
  defaultValue?: unknown;
  onValueChange?: (value: never) => void;
  onValueCommit?: (value: never) => void;
  onRangePreviewChange?: (preview: DateRange | null) => void;
  onInvalidRange?: (reason: RangeReason) => void;
  minDays?: PickConstraints["minDays"];
  maxDays?: PickConstraints["maxDays"];
  allowUnavailableInside?: boolean;
  allowDisabledInside?: boolean;
  maxSelected?: number;
};

function createPanel<V, O>(kind: PanelKind, initial: O): PanelController<V, O> {
  let options = initial as unknown as AnyOptions;
  const id = options.id ?? createId("chrono-date-panel");
  const titleId = `${id}-title`;

  const todayNow = (): PlainDate => readToday(options.timeZone, options.now);
  const bound = (value: DateInput | undefined): PlainDate | undefined =>
    value === undefined ? undefined : toPlainDate(value, options.timeZone);
  const availabilityOf = (): Availability | undefined =>
    options.availability === undefined
      ? undefined
      : compileAvailability(options.availability, {
          timeZone: options.timeZone,
          now: options.now,
        });
  const dayReason = (date: PlainDate): string | undefined => {
    const availability = availabilityOf();
    if (!availability) {
      return undefined;
    }
    return availability
      .getIntervals(
        plainDateTime(date, plainTime(0, 0)),
        plainDateTime(addDays(date, 1), plainTime(0, 0)),
      )
      .find((piece) => piece.status === "unavailable" && piece.rules.length > 0)
      ?.rules[0]?.reason;
  };
  const constraints = (): DateConstraints => ({
    min: bound(options.min),
    max: bound(options.max),
    isDateDisabled: options.isDateDisabled,
    isDateUnavailable: (date) =>
      (options.isDateUnavailable?.(date) ?? false) ||
      availabilityOf()?.getDayStatus(date) === "unavailable",
  });
  const pickConstraints = (): PickConstraints => ({
    ...constraints(),
    minDays: options.minDays,
    maxDays: options.maxDays,
    allowUnavailableInside: options.allowUnavailableInside,
    allowDisabledInside: options.allowDisabledInside,
  });
  const monthCount = (): number => Math.max(1, options.months ?? 1);
  const levelBounds = (): [number, number] => [
    LEVELS.indexOf(options.minLevel ?? "day"),
    LEVELS.indexOf(options.maxLevel ?? "year"),
  ];

  const emptyValue = (): unknown =>
    kind === "single" ? null : kind === "range" ? null : [];
  const valueControl = createControllable<unknown>({
    value: options.value,
    defaultValue: options.defaultValue ?? emptyValue(),
    onChange: (value) =>
      (options.onValueChange as (v: unknown) => void)?.(value),
    equals: (a, b) =>
      kind === "single"
        ? sameNullable(a as DateValue, b as DateValue)
        : kind === "range"
          ? sameRangeValue(a as DateRangeValue, b as DateRangeValue)
          : sameMulti(a as MultiDateValue, b as MultiDateValue),
  });

  /** The date the panel starts on: the value, else today, else the first selectable day. */
  const anchorOf = (value: unknown): PlainDate | undefined =>
    kind === "single"
      ? ((value as DateValue) ?? undefined)
      : kind === "range"
        ? ((value as DateRangeValue)?.start ?? undefined)
        : (value as MultiDateValue)[0];

  const startMonth = (): PanelMonthValue => {
    const anchor = anchorOf(valueControl.get());
    return monthOf(anchor ?? todayNow());
  };
  const monthControl = createControllable<PanelMonthValue>({
    value: options.visibleMonth,
    defaultValue: options.defaultVisibleMonth ?? startMonth(),
    onChange: (month) => options.onVisibleMonthChange?.(month),
    equals: sameMonth,
  });
  const levelControl = createControllable<PanelLevel>({
    value: options.level,
    defaultValue: options.defaultLevel ?? "day",
    onChange: (level) => options.onLevelChange?.(level),
  });

  const firstSelectable = (): PlainDate => {
    const month = monthControl.get();
    const first = plainDate(month.year, month.month, 1);
    const c = constraints();
    for (
      let offset = 0;
      offset < daysInMonth(month.year, month.month);
      offset += 1
    ) {
      const day = plainDate(month.year, month.month, 1 + offset);
      if (getDateStatus(day, c).selectable) return day;
    }
    return first;
  };
  let focusedDate: PlainDate = (() => {
    const anchor = anchorOf(valueControl.get());
    if (anchor) return anchor;
    const today = todayNow();
    const month = monthControl.get();
    return sameMonth(monthOf(today), month) &&
      getDateStatus(today, constraints()).selectable
      ? today
      : firstSelectable();
  })();
  let hoverDate: PlainDate | null = null;
  let beforeDraft: DateRangeValue = null;
  let lastToggled: PlainDate | null = null;
  let lastPreviewKey = "";
  let lastAnchorKey = anchorOf(valueControl.get())
    ? toIsoString(anchorOf(valueControl.get()) as PlainDate)
    : "";
  let state: PanelState;
  const listeners = new Set<(state: PanelState) => void>();
  const blockedCache = new Map<string, boolean>();

  const fix = (): void => {
    const level = levelControl.get();
    const month = monthControl.get();
    if (level === "day") {
      const last = addMonths(
        plainDate(month.year, month.month, 1),
        monthCount() - 1,
      );
      const first = plainDate(month.year, month.month, 1);
      if (
        compare(focusedDate, first) < 0 ||
        compare(focusedDate, endOfMonth(last)) > 0
      ) {
        focusedDate = plainDate(
          month.year,
          month.month,
          Math.min(focusedDate.day, daysInMonth(month.year, month.month)),
        );
      }
    } else if (focusedDate.year !== month.year && level === "month") {
      focusedDate = plainDate(month.year, focusedDate.month, 1);
    }
  };

  const compute = (): PanelState => {
    fix();
    const locale =
      options.locale === undefined ? undefined : resolveLocale(options.locale);
    const weekInfo = getWeekInfo(locale);
    const weekStartsOn = options.weekStartsOn ?? weekInfo.firstDay;
    const messages = mergeMessages(defaultMessages, options.messages);
    const today = todayNow();
    const c = constraints();
    const pc = pickConstraints();
    const level = levelControl.get();
    const month = monthControl.get();
    const count = monthCount();
    const value = valueControl.get();
    const draft = kind === "range" && isDraft(value as DateRangeValue);
    const rangeValue = kind === "range" ? (value as DateRangeValue) : null;
    const multi = kind === "multi" ? (value as MultiDateValue) : [];
    const multiKeys = new Set(multi.map(toIsoString));
    const start = rangeValue?.start ?? null;
    const end = rangeValue?.end ?? null;

    let preview: Range | null = null;
    if (draft && start) {
      preview = previewRange(start, hoverDate ?? focusedDate, pc);
    }
    const blockedFor = (day: PlainDate): boolean => {
      if (kind === "multi") {
        return (
          options.maxSelected !== undefined &&
          multi.length >= options.maxSelected &&
          !multiKeys.has(toIsoString(day))
        );
      }
      if (!draft || !start) return false;
      const cacheKey = `${toIsoString(start)}|${toIsoString(day)}`;
      let blocked = blockedCache.get(cacheKey);
      if (blocked === undefined) {
        blocked = isBlocked(start, day, pc);
        blockedCache.set(cacheKey, blocked);
      }
      return blocked;
    };

    const first = plainDate(month.year, month.month, 1);
    const grids = getMonths(month, count, {
      weekStartsOn,
      weekInfo,
      today,
      weekNumbers: options.weekNumbers || undefined,
      fixedWeeks: count > 1,
    });
    const names = getMonthNames(locale, "long");
    const months: PanelMonth[] =
      level === "day"
        ? grids.map((grid) => ({
            key: `${grid.year}-${String(grid.month).padStart(2, "0")}`,
            title: `${names[grid.month - 1]} ${grid.year}`,
            weeks: grid.weeks.map((week) => ({
              weekNumber: week.weekNumber,
              days: week.days.map((day): PanelDay => {
                const status = getDateStatus(day.date, c);
                const hidden = count > 1 && day.outsideMonth;
                const iso = toIsoString(day.date);
                const isStart = start !== null && isSameDay(day.date, start);
                const isEnd = end !== null && isSameDay(day.date, end);
                const previewing =
                  preview !== null &&
                  compare(day.date, preview.start) >= 0 &&
                  compare(day.date, preview.end) <= 0;
                const selected =
                  kind === "single"
                    ? value !== null && isSameDay(day.date, value as PlainDate)
                    : kind === "multi"
                      ? multiKeys.has(iso)
                      : isStart ||
                        isEnd ||
                        (start !== null &&
                          end !== null &&
                          compare(day.date, start) > 0 &&
                          compare(day.date, end) < 0);
                return {
                  date: day.date,
                  key: iso,
                  hidden,
                  outsideMonth: day.outsideMonth,
                  today: day.today,
                  weekend: day.weekend,
                  selected,
                  disabled: status.disabled,
                  unavailable: status.unavailable,
                  partiallyAvailable:
                    !status.unavailable &&
                    availabilityOf()?.getDayStatus(day.date) === "partial",
                  blocked: !hidden && blockedFor(day.date),
                  focused: !hidden && isSameDay(day.date, focusedDate),
                  rangeStart: isStart,
                  rangeEnd: isEnd,
                  inRange:
                    start !== null &&
                    end !== null &&
                    compare(day.date, start) > 0 &&
                    compare(day.date, end) < 0,
                  preview: previewing,
                };
              }),
            })),
          }))
        : [];

    const minDate = c.min;
    const maxDate = c.max;
    const monthCells = (): PanelCell[] =>
      Array.from({ length: 12 }, (_, index) => {
        const m = index + 1;
        const key = `${month.year}-${String(m).padStart(2, "0")}`;
        const monthStart = plainDate(month.year, m, 1);
        const anchor = anchorOf(value);
        return {
          key,
          year: month.year,
          month: m,
          label: formatDate(monthStart, locale, {
            month: "long",
            year: "numeric",
          }),
          text: names[index] as string,
          selected:
            anchor !== undefined &&
            anchor.year === month.year &&
            anchor.month === m,
          disabled:
            (minDate !== undefined &&
              compare(endOfMonth(monthStart), minDate) < 0) ||
            (maxDate !== undefined && compare(monthStart, maxDate) > 0),
          focused: focusedDate.year === month.year && focusedDate.month === m,
          current: today.year === month.year && today.month === m,
          outside: false,
        };
      });
    const decade = Math.floor(month.year / 10) * 10;
    const yearCells = (): PanelCell[] =>
      Array.from({ length: 12 }, (_, index) => {
        const year = decade - 1 + index;
        const anchor = anchorOf(value);
        return {
          key: String(year),
          year,
          month: 1,
          label: String(year),
          text: String(year),
          selected: anchor !== undefined && anchor.year === year,
          disabled:
            year < 1 ||
            year > 9999 ||
            (minDate !== undefined && year < minDate.year) ||
            (maxDate !== undefined && year > maxDate.year),
          focused: focusedDate.year === year,
          current: today.year === year,
          outside: year < decade || year > decade + 9,
        };
      }).filter((cell) => cell.year >= 1 && cell.year <= 9999);

    const lastMonth = addMonths(first, count - 1);
    const title =
      level === "day"
        ? count === 1
          ? formatDate(first, locale, { month: "long", year: "numeric" })
          : formatDateRange(
              { start: first, end: endOfMonth(lastMonth) },
              locale,
              {
                month: "long",
                year: "numeric",
              },
            )
        : level === "month"
          ? String(month.year)
          : `${Math.max(decade, 1)} – ${Math.min(decade + 9, 9999)}`;

    const step = options.pageBy === "visible" ? count : 1;
    const canGoPrev =
      level === "day"
        ? minDate === undefined || compare(first, minDate) > 0
        : level === "month"
          ? minDate === undefined || minDate.year < month.year
          : minDate === undefined || minDate.year < decade;
    const canGoNext =
      level === "day"
        ? maxDate === undefined || compare(endOfMonth(lastMonth), maxDate) < 0
        : level === "month"
          ? maxDate === undefined || maxDate.year > month.year
          : maxDate === undefined || maxDate.year > decade + 9;
    void step;
    const [minIndex, maxIndex] = levelBounds();
    const countValue =
      kind === "multi"
        ? multi.length
        : start !== null && end !== null
          ? Math.round(
              (Date.UTC(end.year, end.month - 1, end.day) -
                Date.UTC(start.year, start.month - 1, start.day)) /
                86400000,
            ) + 1
          : kind === "single" && value !== null
            ? 1
            : 0;

    return {
      id,
      kind,
      level,
      value: value as PanelState["value"],
      draft,
      preview,
      visibleMonth: month,
      title,
      today,
      focusedDate,
      weekdays: getWeekdayHeaders(locale, { weekStartsOn }),
      weekNumbers: Boolean(options.weekNumbers),
      months,
      cells:
        level === "month" ? monthCells() : level === "year" ? yearCells() : [],
      canGoPrev,
      canGoNext,
      canGoUp:
        LEVELS.indexOf(level) < maxIndex && LEVELS.indexOf(level) >= minIndex,
      readOnly: options.readOnly ?? false,
      disabled: options.disabled ?? false,
      autoFocus: options.autoFocus ?? false,
      direction: getTextDirection(locale),
      locale,
      messages,
      count: countValue,
    };
  };

  const refresh = (): void => {
    const next = compute();
    if (state && JSON.stringify(state) === JSON.stringify(next)) return;
    state = next;
    if (kind === "range") {
      const key = next.preview
        ? `${toIsoString(next.preview.start)}|${toIsoString(next.preview.end)}`
        : "";
      if (key !== lastPreviewKey) {
        lastPreviewKey = key;
        options.onRangePreviewChange?.(next.preview);
      }
    }
    for (const listener of [...listeners]) listener(state);
  };
  state = compute();

  /** Scroll the visible months so `date` is shown. */
  const showDate = (date: PlainDate): void => {
    const month = monthControl.get();
    const first = plainDate(month.year, month.month, 1);
    const last = addMonths(first, monthCount() - 1);
    if (compare(date, first) < 0) {
      monthControl.set(monthOf(date));
    } else if (compare(date, endOfMonth(last)) > 0) {
      monthControl.set(
        monthOf(addMonths(startOfMonth(date), -(monthCount() - 1))),
      );
    }
  };

  const setValue = (value: unknown): void => {
    blockedCache.clear();
    valueControl.set(value);
  };

  const setLevelClamped = (level: PanelLevel): void => {
    const [min, max] = levelBounds();
    const index = Math.min(max, Math.max(min, LEVELS.indexOf(level)));
    levelControl.set(LEVELS[index] as PanelLevel);
  };

  const controller: PanelController<V, O> = {
    getState: () => state,
    getValue: () => valueControl.get() as V,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setOptions(next) {
      options = { ...options, ...(next as AnyOptions) };
      const before = anchorOf(valueControl.get());
      valueControl.sync({ value: options.value });
      monthControl.sync({ value: options.visibleMonth });
      levelControl.sync({ value: options.level });
      blockedCache.clear();
      const anchor = anchorOf(valueControl.get());
      const key = anchor ? toIsoString(anchor) : "";
      if (
        options.followValue !== false &&
        anchor &&
        key !== lastAnchorKey &&
        !(before && isSameDay(before, anchor) && lastAnchorKey === key)
      ) {
        showDate(anchor);
        if (levelControl.get() === "day") focusedDate = anchor;
      }
      lastAnchorKey = key;
      refresh();
    },
    pick(date, _source) {
      if (options.disabled) return;
      const level = levelControl.get();
      focusedDate = date;
      if (level !== "day") {
        // Drill down: a month goes to the day level of that month, a year to its months.
        monthControl.set(
          level === "month"
            ? monthOf(date)
            : { year: date.year, month: monthControl.get().month },
        );
        setLevelClamped(LEVELS[LEVELS.indexOf(level) - 1] as PanelLevel);
        refresh();
        return;
      }
      showDate(date);
      if (options.readOnly) {
        refresh();
        return;
      }
      if (kind === "single") {
        if (getDateStatus(date, constraints()).selectable) {
          setValue(date);
          (options.onValueCommit as ((v: PlainDate) => void) | undefined)?.(
            date,
          );
        }
      } else if (kind === "range") {
        const current = valueControl.get() as DateRangeValue;
        const result = pickRange(current, date, pickConstraints());
        if (result.kind === "draft") {
          beforeDraft = current?.start && current.end ? current : null;
          setValue(result.value);
        } else if (result.kind === "complete") {
          setValue(result.value);
          (options.onValueCommit as ((v: DateRange) => void) | undefined)?.(
            result.value,
          );
        } else {
          options.onInvalidRange?.(result.reason);
        }
      } else {
        const current = valueControl.get() as MultiDateValue;
        const next = toggleDate(
          current,
          date,
          constraints(),
          options.maxSelected,
        );
        lastToggled = date;
        if (next !== current) setValue(next);
      }
      refresh();
    },
    extendTo(date) {
      if (kind !== "multi" || options.disabled || options.readOnly) return;
      const current = valueControl.get() as MultiDateValue;
      const next = addBetween(
        current,
        lastToggled ?? focusedDate,
        date,
        constraints(),
        options.maxSelected,
      );
      lastToggled = date;
      focusedDate = date;
      if (!sameMulti(current, next)) setValue(next);
      refresh();
    },
    setPreview(date) {
      hoverDate = date;
      refresh();
    },
    cancelDraft() {
      if (kind !== "range" || !isDraft(valueControl.get() as DateRangeValue))
        return;
      hoverDate = null;
      setValue(beforeDraft);
      beforeDraft = null;
      refresh();
    },
    clear() {
      if (options.disabled || options.readOnly) return;
      hoverDate = null;
      setValue(emptyValue());
      refresh();
    },
    commit() {
      if (kind === "multi") {
        (options.onValueCommit as ((v: MultiDateValue) => void) | undefined)?.(
          valueControl.get() as MultiDateValue,
        );
      }
    },
    today() {
      const today = todayNow();
      focusedDate = today;
      monthControl.set(monthOf(today));
      setLevelClamped("day");
      if (
        kind === "single" &&
        options.selectToday &&
        !options.readOnly &&
        getDateStatus(today, constraints()).selectable
      ) {
        setValue(today);
        (options.onValueCommit as ((v: PlainDate) => void) | undefined)?.(
          today,
        );
      }
      refresh();
    },
    prev() {
      page(-1);
    },
    next() {
      page(1);
    },
    setLevel(level) {
      setLevelClamped(level);
      refresh();
    },
    focusDate(date) {
      focusedDate = date;
      const level = levelControl.get();
      if (level === "day") {
        showDate(date);
      } else {
        const month = monthControl.get();
        if (level === "month" && date.year !== month.year) {
          monthControl.set({ year: date.year, month: month.month });
        }
        if (level === "year") {
          monthControl.set({ year: date.year, month: month.month });
        }
      }
      refresh();
    },
    handleKeyDown(key, modifiers) {
      if (options.disabled) return false;
      const level = levelControl.get();
      if (modifiers.ctrl || modifiers.meta) {
        if (key === "ArrowUp" && state.canGoUp) {
          setLevelClamped(LEVELS[LEVELS.indexOf(level) + 1] as PanelLevel);
          refresh();
          return true;
        }
        return false;
      }
      if (key === "Enter" || key === " ") {
        if (kind === "multi" && modifiers.shift && level === "day") {
          controller.extendTo(state.focusedDate);
        } else {
          controller.pick(state.focusedDate, "keyboard");
        }
        return true;
      }
      if (key === "Escape") {
        if (kind === "range" && state.draft) {
          controller.cancelDraft();
          return true;
        }
        return false;
      }
      if (!NAV_KEYS.has(key)) return false;
      const weekInfo = getWeekInfo(state.locale);
      const c = constraints();
      const moved = nextFocusedDate(
        state.focusedDate,
        key as Parameters<typeof nextFocusedDate>[1],
        { shift: modifiers.shift },
        {
          weekStartsOn: options.weekStartsOn ?? weekInfo.firstDay,
          direction: state.direction,
          min: c.min,
          max: c.max,
          level,
        },
      );
      hoverDate = null;
      controller.focusDate(moved);
      return true;
    },

    getRootAttributes: () => ({
      role: "group",
      "data-chrono-date-panel": kind === "single" ? true : kind,
      "data-level": state.level,
      "data-disabled": state.disabled,
      "data-readonly": state.readOnly,
      dir: state.direction,
    }),
    getTitleAttributes: () => ({ id: titleId, "aria-live": "polite" }),
    getLevelButtonAttributes: () => ({
      type: "button",
      "aria-label":
        state.level === "day"
          ? state.messages.chooseMonth
          : state.messages.chooseYear,
      "aria-disabled": state.canGoUp ? undefined : "true",
      "data-disabled": !state.canGoUp,
      "data-level": state.level,
    }),
    getNavAttributes: (kind) => {
      const disabled = kind === "prev" ? !state.canGoPrev : !state.canGoNext;
      return {
        type: "button",
        "aria-label":
          kind === "prev" ? state.messages.previous : state.messages.next,
        "aria-disabled": disabled ? "true" : undefined,
        "data-disabled": disabled,
      };
    },
    getTodayButtonAttributes: () => ({
      type: "button",
      "aria-label": state.messages.goToToday,
      "data-disabled": state.disabled,
    }),
    getGridAttributes: () => ({
      role: "grid",
      "aria-labelledby": titleId,
      "aria-multiselectable": kind === "single" ? undefined : "true",
      "aria-readonly": state.readOnly ? "true" : undefined,
    }),
    getColumnHeaderAttributes: (header) => ({
      role: "columnheader",
      abbr: header.long,
      "data-weekend": header.weekend,
    }),
    getWeekNumberAttributes: (weekNumber) => ({
      role: "rowheader",
      "aria-label": state.messages.weekNumber.replace(
        "{number}",
        String(weekNumber),
      ),
    }),
    getCellAttributes(day) {
      if (day.hidden) {
        return { role: "gridcell", "aria-hidden": "true", "data-hidden": true };
      }
      const unselectable = day.disabled || day.unavailable || day.blocked;
      return {
        role: "gridcell",
        "aria-label": getDateLabel(
          day.date,
          state.locale,
          {
            today: day.today,
            selected:
              day.selected && !day.rangeStart && !day.rangeEnd && !day.inRange,
            unavailable: day.unavailable,
            partiallyAvailable: day.partiallyAvailable,
            disabled: day.disabled,
            reason: dayReason(day.date),
            rangeStart: day.rangeStart,
            rangeEnd: day.rangeEnd,
            inRange: day.inRange,
          },
          state.messages,
        ),
        "aria-selected": day.selected
          ? "true"
          : unselectable
            ? undefined
            : "false",
        "aria-current": day.today ? "date" : undefined,
        "aria-disabled": unselectable ? "true" : undefined,
        tabindex: day.focused ? 0 : -1,
        "data-chrono-key": day.key,
        "data-selected": day.selected,
        "data-today": day.today,
        "data-outside-month": day.outsideMonth,
        "data-weekend": day.weekend,
        "data-disabled": day.disabled,
        "data-unavailable": day.unavailable,
        "data-partially-available": day.partiallyAvailable,
        "data-focused": day.focused,
        "data-range-start": day.rangeStart,
        "data-range-end": day.rangeEnd,
        "data-in-range": day.inRange,
        "data-range-preview": day.preview && !day.selected,
        "data-range-blocked": day.blocked,
      };
    },
    getLevelCellAttributes: (cell) => ({
      role: "gridcell",
      "aria-label": cell.label,
      "aria-selected": cell.selected
        ? "true"
        : cell.disabled
          ? undefined
          : "false",
      "aria-current": cell.current ? "date" : undefined,
      "aria-disabled": cell.disabled ? "true" : undefined,
      tabindex: cell.focused ? 0 : -1,
      "data-chrono-key": cell.key,
      "data-selected": cell.selected,
      "data-today": cell.current,
      "data-disabled": cell.disabled,
      "data-focused": cell.focused,
      "data-outside-month": cell.outside,
    }),
    destroy() {
      listeners.clear();
    },
  };

  function page(step: 1 | -1): void {
    if (options.disabled) return;
    if (step === -1 ? !state.canGoPrev : !state.canGoNext) return;
    const level = levelControl.get();
    const month = monthControl.get();
    const first = plainDate(month.year, month.month, 1);
    if (level === "day") {
      const by = (options.pageBy === "visible" ? monthCount() : 1) * step;
      monthControl.set(monthOf(addMonths(first, by)));
      focusedDate = addMonths(focusedDate, by);
    } else {
      const by = (level === "year" ? 10 : 1) * step;
      monthControl.set({ year: month.year + by, month: month.month });
      focusedDate = addYears(focusedDate, by);
    }
    refresh();
  }

  return controller;
}

export const createDatePanelController = (
  options: DatePanelOptions = {},
): PanelController<DateValue, DatePanelOptions> =>
  createPanel("single", options);

export const createDateRangePanelController = (
  options: DateRangePanelOptions = {},
): PanelController<DateRangeValue, DateRangePanelOptions> =>
  createPanel("range", options);

export const createMultiDatePanelController = (
  options: MultiDatePanelOptions = {},
): PanelController<MultiDateValue, MultiDatePanelOptions> =>
  createPanel("multi", options);
