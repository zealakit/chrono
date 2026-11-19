import {
  type Attributes,
  type Availability,
  type AvailabilitySpec,
  type HiddenInput,
  type Messages,
  type PlainTime,
  type SegmentDef,
  type SegmentValue,
  type TimeInput,
  backspace,
  compileAvailability,
  createControllable,
  createId,
  defaultMessages,
  emptySegment,
  filterDailyRules,
  fold,
  formatTime,
  getDayPeriodNames,
  getHiddenInputs,
  getHourCycle,
  getTextDirection,
  isSameTime,
  mergeMessages,
  nowZoned,
  plainTime,
  today as readTodayDate,
  resolveLocale,
  segmentOf,
  snapTime,
  stepSegment,
  toLatinDigits,
  toLocaleDigits,
  toPlainTime,
  typeDigit,
  type TimeConstraints,
} from "../../foundation/index.js";
import type {
  HourCycle,
  TimeGranularity,
  TimePartName,
  TimeValue,
} from "../types.js";
import {
  type TimeParseContext,
  type TimeParseResult,
  parseTime,
} from "./parse.js";
import {
  type TimeValidity,
  getTimeValidity,
  isTimeInvalid,
} from "./validity.js";

export type TimeInputOptions = {
  id?: string;
  value?: TimeValue;
  defaultValue?: TimeValue;
  onValueChange?: (value: TimeValue) => void;
  /** On blur or Enter with a valid value. */
  onValueCommit?: (value: PlainTime) => void;
  mode?: "segmented" | "text";
  granularity?: TimeGranularity;
  hourCycle?: HourCycle;
  step?: { minutes?: number; seconds?: number };
  /** The value ↑/↓ starts from on an empty part (default: now, rounded down to the step). */
  placeholderValue?: TimeInput;
  parse?: (text: string, context: TimeParseContext) => PlainTime | null;
  format?: (
    time: PlainTime,
    context: { locale?: string; hourCycle: HourCycle },
  ) => string;
  onInvalidInput?: (text: string) => void;
  name?: string;
  required?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  min?: TimeInput;
  max?: TimeInput;
  disabledRanges?: readonly { start: TimeInput; end: TimeInput }[];
  isTimeDisabled?: (time: PlainTime) => boolean;
  isTimeUnavailable?: (time: PlainTime) => boolean;
  /** Availability model (plan 11 V6): `daily` rules only. */
  availability?: AvailabilitySpec | Availability;
  locale?: string;
  timeZone?: string;
  now?: number;
  messages?: Partial<Messages>;
  /** Internal: called when focus tries to leave the first (-1) or last (1) part. */
  onFocusEdge?: (direction: 1 | -1) => void;
};

export type TimeSegmentView = {
  type: TimePartName | "literal";
  text: string;
  value: number | null;
  placeholder: string;
  min: number;
  max: number;
  valueText: string;
  editable: boolean;
};

export type TimeInputState = {
  id: string;
  mode: "segmented" | "text";
  segments: TimeSegmentView[];
  text: string;
  value: TimeValue;
  validity: TimeValidity;
  focusedPart: TimePartName;
  granularity: TimeGranularity;
  hourCycle: HourCycle;
  pattern: string;
  required: boolean;
  readOnly: boolean;
  disabled: boolean;
  direction: "ltr" | "rtl";
  locale?: string;
  messages: Messages;
  hidden: HiddenInput[];
};

export type TimeKeyModifiers = { shift: boolean; ctrl: boolean; meta: boolean };

export type TimeInputController = {
  getState(): TimeInputState;
  subscribe(listener: (state: TimeInputState) => void): () => void;
  setOptions(options: Partial<TimeInputOptions>): void;
  handleKeyDown(
    part: TimePartName,
    key: string,
    modifiers: TimeKeyModifiers,
  ): boolean;
  focusPart(part: TimePartName): void;
  settle(): void;
  paste(text: string): boolean;
  setText(text: string): void;
  commitText(): boolean;
  commit(): void;
  clear(): void;
  reset(): void;
  handleTextKeyDown(key: string): boolean;
  getRootAttributes(): Attributes;
  getSegmentAttributes(segment: TimeSegmentView): Attributes;
  getTextFieldAttributes(): Attributes;
  getClearButtonAttributes(): Attributes;
  destroy(): void;
};

const sameNullable = (a: TimeValue, b: TimeValue): boolean =>
  a === b || (a !== null && b !== null && isSameTime(a, b));

type Layout = { type: TimePartName | "literal"; text: string }[];

/** Part order and separators from `Intl`, e.g. `hour : minute " " dayPeriod`. */
function layoutOf(
  locale: string | undefined,
  hourCycle: HourCycle,
  granularity: TimeGranularity,
): Layout {
  const formatter = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: granularity === "hour" ? undefined : "2-digit",
    second: granularity === "second" ? "2-digit" : undefined,
    hourCycle,
    timeZone: "UTC",
  });
  const result: Layout = [];
  for (const part of formatter.formatToParts(Date.UTC(2020, 0, 1, 15, 4, 5))) {
    if (
      part.type === "hour" ||
      part.type === "minute" ||
      part.type === "second" ||
      part.type === "dayPeriod"
    ) {
      result.push({ type: part.type, text: "" });
    } else if (part.type === "literal") {
      result.push({ type: "literal", text: part.value });
    }
  }
  if (
    hourCycle === "h12" &&
    !result.some((item) => item.type === "dayPeriod")
  ) {
    result.push(
      { type: "literal", text: " " },
      { type: "dayPeriod", text: "" },
    );
  }
  return result;
}

export function createTimeInputController(
  initial: TimeInputOptions = {},
): TimeInputController {
  let options = initial;
  const id = options.id ?? createId("chrono-time-input");
  const localeOf = (): string | undefined =>
    options.locale === undefined ? undefined : resolveLocale(options.locale);
  const granularity = (): TimeGranularity => options.granularity ?? "minute";
  const hourCycle = (): HourCycle =>
    options.hourCycle ?? getHourCycle(localeOf());
  const bound = (value: TimeInput | undefined): PlainTime | undefined =>
    value === undefined ? undefined : toPlainTime(value);
  const availabilityOf = (): Availability | undefined => {
    if (options.availability === undefined) {
      return undefined;
    }
    const input =
      typeof (options.availability as Availability).getDayStatus === "function"
        ? (options.availability as Availability)
        : filterDailyRules(options.availability as AvailabilitySpec);
    return compileAvailability(input, {
      timeZone: options.timeZone,
      now: options.now,
    });
  };
  const unavailableAt = (time: PlainTime): boolean => {
    const availability = availabilityOf();
    return (
      (options.isTimeUnavailable?.(time) ?? false) ||
      (availability
        ? !availability.isTimeAvailable(
            readTodayDate(options.timeZone, options.now),
            time,
          )
        : false)
    );
  };
  const constraints = (): TimeConstraints & {
    isTimeUnavailable?: (time: PlainTime) => boolean;
  } => ({
    min: bound(options.min),
    max: bound(options.max),
    step: options.step,
    disabledRanges: options.disabledRanges?.map((range) => ({
      start: toPlainTime(range.start),
      end: toPlainTime(range.end),
    })),
    isTimeDisabled: options.isTimeDisabled,
    isTimeUnavailable: unavailableAt,
  });

  const control = createControllable<TimeValue>({
    value: options.value,
    defaultValue: options.defaultValue ?? null,
    onChange: (value) => options.onValueChange?.(value),
    equals: sameNullable,
  });

  type Parts = Record<TimePartName, SegmentValue>;
  let parts: Parts = {
    hour: emptySegment,
    minute: emptySegment,
    second: emptySegment,
    dayPeriod: emptySegment,
  };
  let text = "";
  let textValue: TimeValue = null;
  let invalidText = false;
  let letters = "";
  let state: TimeInputState;
  const listeners = new Set<(state: TimeInputState) => void>();

  const requiredParts = (): TimePartName[] => {
    const list: TimePartName[] = ["hour"];
    if (granularity() !== "hour") list.push("minute");
    if (granularity() === "second") list.push("second");
    if (hourCycle() === "h12") list.push("dayPeriod");
    return list;
  };
  const visibleOrder = (): TimePartName[] =>
    layoutOf(localeOf(), hourCycle(), granularity())
      .map((item) => item.type)
      .filter((type): type is TimePartName => type !== "literal");

  let focusedPart: TimePartName = visibleOrder()[0] as TimePartName;
  const formatValue = (time: PlainTime): string =>
    options.format
      ? options.format(time, { locale: localeOf(), hourCycle: hourCycle() })
      : formatTime(time, localeOf(), {
          hour: "numeric",
          minute: granularity() === "hour" ? undefined : "2-digit",
          second: granularity() === "second" ? "2-digit" : undefined,
          hourCycle: hourCycle(),
        });
  const parseContext = (): TimeParseContext => ({
    locale: localeOf(),
    hourCycle: hourCycle(),
    granularity: granularity(),
  });
  const parseText = (value: string): TimeParseResult => {
    if (options.parse) {
      if (value.trim() === "") return { error: "empty" };
      const time = options.parse(value, parseContext());
      return time ? { time } : { error: "unparseable" };
    }
    return parseTime(value, parseContext());
  };

  const syncParts = (value: TimeValue): void => {
    if (value) {
      const h12 = hourCycle() === "h12";
      parts = {
        hour: segmentOf(h12 ? value.hour % 12 || 12 : value.hour),
        minute: segmentOf(value.minute),
        second: segmentOf(value.second),
        dayPeriod: segmentOf(value.hour >= 12 ? 1 : 0),
      };
    } else {
      parts = {
        hour: emptySegment,
        minute: emptySegment,
        second: emptySegment,
        dayPeriod: emptySegment,
      };
    }
    text = value ? formatValue(value) : "";
    textValue = value;
    invalidText = false;
  };
  syncParts(control.get());

  const derive = (): TimeValue => {
    const required = requiredParts();
    if (required.some((part) => parts[part].value === null)) return null;
    let hour = parts.hour.value as number;
    if (hourCycle() === "h12")
      hour = (hour % 12) + (parts.dayPeriod.value === 1 ? 12 : 0);
    return plainTime(
      hour,
      granularity() === "hour" ? 0 : (parts.minute.value as number),
      granularity() === "second" ? (parts.second.value as number) : 0,
    );
  };
  const filledCount = (): number =>
    requiredParts().filter((part) => parts[part].value !== null).length;

  const def = (part: TimePartName): SegmentDef => {
    if (part === "hour") {
      return hourCycle() === "h12"
        ? { min: 1, max: 12, maxDigits: 2, pageStep: 3 }
        : { min: 0, max: 23, maxDigits: 2, pageStep: 3 };
    }
    if (part === "dayPeriod")
      return { min: 0, max: 1, maxDigits: 1, pageStep: 1 };
    return { min: 0, max: 59, maxDigits: 2, pageStep: 15 };
  };
  const stepOf = (part: TimePartName): number =>
    part === "minute"
      ? (options.step?.minutes ?? 1)
      : part === "second"
        ? (options.step?.seconds ?? 1)
        : 1;

  const placeholder = (): PlainTime => {
    if (options.placeholderValue !== undefined)
      return toPlainTime(options.placeholderValue);
    const zoned = nowZoned(options.timeZone ?? "UTC", options.now);
    const time = plainTime(zoned.hour, zoned.minute, 0);
    const size =
      (options.step?.minutes ?? 0) * 60 + (options.step?.seconds ?? 0);
    return size > 0 ? snapTime(time, options.step ?? {}, "floor") : time;
  };

  const validityNow = (): TimeValidity => {
    if (options.mode === "text") {
      if (text.trim() === "") return "empty";
      if (invalidText) return "incomplete";
      const value = control.get();
      return value ? getTimeValidity(1, 1, value, constraints()) : "incomplete";
    }
    return getTimeValidity(
      filledCount(),
      requiredParts().length,
      derive(),
      constraints(),
    );
  };

  const compute = (): TimeInputState => {
    const locale = localeOf();
    const messages = mergeMessages(defaultMessages, options.messages);
    const names = getDayPeriodNames(locale);
    const placeholders: Record<TimePartName, string> = {
      hour: messages.placeholderHour,
      minute: messages.placeholderMinute,
      second: messages.placeholderSecond,
      dayPeriod: messages.placeholderDayPeriod,
    };
    const display = (part: TimePartName): string => {
      const segment = parts[part];
      if (part === "dayPeriod") {
        return segment.value === null
          ? placeholders[part]
          : segment.value === 1
            ? names.pm
            : names.am;
      }
      if (segment.buffer !== "") return toLocaleDigits(segment.buffer, locale);
      if (segment.value === null) return placeholders[part];
      const pad = part !== "hour" || hourCycle() === "h23";
      return toLocaleDigits(
        String(segment.value).padStart(pad ? 2 : 1, "0"),
        locale,
      );
    };
    const segments: TimeSegmentView[] = layoutOf(
      locale,
      hourCycle(),
      granularity(),
    ).map((item): TimeSegmentView => {
      if (item.type === "literal") {
        return {
          type: "literal",
          text: item.text,
          value: null,
          placeholder: "",
          min: 0,
          max: 0,
          valueText: "",
          editable: false,
        };
      }
      const bounds = def(item.type);
      const shown = display(item.type);
      return {
        type: item.type,
        text: shown,
        value: parts[item.type].value,
        placeholder: placeholders[item.type],
        min: bounds.min,
        max: bounds.max,
        valueText: parts[item.type].value === null ? messages.empty : shown,
        editable: true,
      };
    });
    const value = control.get();
    const pattern = segments
      .map((item) => (item.type === "literal" ? item.text : item.placeholder))
      .join("");
    return {
      id,
      mode: options.mode ?? "segmented",
      segments,
      text,
      value,
      validity: validityNow(),
      focusedPart,
      granularity: granularity(),
      hourCycle: hourCycle(),
      pattern,
      required: options.required ?? false,
      readOnly: options.readOnly ?? false,
      disabled: options.disabled ?? false,
      direction: getTextDirection(locale),
      locale,
      messages,
      hidden: getHiddenInputs([
        [
          options.name,
          value
            ? `${String(value.hour).padStart(2, "0")}:${String(value.minute).padStart(2, "0")}${granularity() === "second" ? `:${String(value.second).padStart(2, "0")}` : ""}`
            : null,
        ],
      ]),
    };
  };

  const refresh = (): void => {
    const next = compute();
    if (state && JSON.stringify(state) === JSON.stringify(next)) return;
    state = next;
    for (const listener of [...listeners]) listener(state);
  };
  state = compute();

  const afterEdit = (): void => {
    const next = derive();
    if (!sameNullable(next, control.get())) control.set(next);
    refresh();
  };
  const moveFocus = (part: TimePartName, step: 1 | -1): void => {
    const order = visibleOrder();
    const target = order[order.indexOf(part) + step];
    if (target) focusedPart = target;
    else options.onFocusEdge?.(step);
  };
  const setSegment = (part: TimePartName, segment: SegmentValue): void => {
    parts = { ...parts, [part]: segment };
  };
  let lastCommitted: TimeValue = control.get();

  /** Match typed letters against the localized AM/PM labels (prefix, case-insensitive). */
  const typeLetter = (key: string): boolean => {
    if (key.length !== 1 || !/\p{L}/u.test(key)) return false;
    const names = getDayPeriodNames(localeOf());
    const clean = (value: string) => fold(value).replace(/[.\s]/g, "");
    const labels = [clean(names.am), clean(names.pm)];
    const match = (buffer: string): number[] =>
      labels.flatMap((label, index) =>
        label.startsWith(buffer) ? [index] : [],
      );
    letters += clean(key);
    let found = match(letters);
    if (found.length === 0) {
      letters = clean(key);
      found = match(letters);
    }
    if (found.length === 0) return true;
    if (found.length === 1) {
      setSegment("dayPeriod", segmentOf(found[0] as number));
      letters = "";
      afterEdit();
    }
    return true;
  };

  const controller: TimeInputController = {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setOptions(next) {
      options = { ...options, ...next };
      control.sync({ value: options.value });
      if (options.mode === "text") {
        if (!sameNullable(textValue, control.get())) syncParts(control.get());
      } else if (!sameNullable(derive(), control.get())) {
        syncParts(control.get());
      }
      refresh();
    },
    focusPart(part) {
      if (focusedPart !== part) {
        focusedPart = part;
        letters = "";
        refresh();
      }
    },
    settle() {
      letters = "";
    },
    handleKeyDown(part, key, modifiers) {
      if (options.disabled || modifiers.ctrl || modifiers.meta) return false;
      const rtl = state.direction === "rtl";
      if (key === "ArrowLeft" || key === "ArrowRight") {
        letters = "";
        moveFocus(part, (key === "ArrowRight") !== rtl ? 1 : -1);
        refresh();
        return true;
      }
      if (key === "Enter") {
        controller.commit();
        return false;
      }
      if (options.readOnly) return false;
      if (part === "dayPeriod" && typeLetter(key)) return true;
      const latin = toLatinDigits(key, localeOf());
      if (part !== "dayPeriod" && /^\d$/.test(latin)) {
        const result = typeDigit(def(part), parts[part], Number(latin));
        setSegment(part, result.segment);
        if (result.advance) moveFocus(part, 1);
        afterEdit();
        return true;
      }
      const bounds = def(part);
      if (
        key === "ArrowUp" ||
        key === "ArrowDown" ||
        key === "PageUp" ||
        key === "PageDown"
      ) {
        const direction = key === "ArrowUp" || key === "PageUp" ? 1 : -1;
        const amount =
          part === "dayPeriod"
            ? 1
            : key.startsWith("Page")
              ? bounds.pageStep
              : stepOf(part);
        const p = placeholder();
        const start =
          part === "hour"
            ? hourCycle() === "h12"
              ? p.hour % 12 || 12
              : p.hour
            : part === "minute"
              ? p.minute
              : part === "second"
                ? p.second
                : p.hour >= 12
                  ? 1
                  : 0;
        setSegment(
          part,
          stepSegment(bounds, parts[part], direction * amount, start),
        );
        afterEdit();
        return true;
      }
      if (key === "Home" || key === "End") {
        setSegment(part, segmentOf(key === "Home" ? bounds.min : bounds.max));
        afterEdit();
        return true;
      }
      if (key === "Backspace" || key === "Delete") {
        setSegment(
          part,
          key === "Backspace" && part !== "dayPeriod"
            ? backspace(parts[part])
            : emptySegment,
        );
        afterEdit();
        return true;
      }
      return false;
    },
    paste(value) {
      if (options.disabled || options.readOnly) return false;
      const result = parseText(value);
      if ("time" in result) {
        syncParts(result.time);
        afterEdit();
        return true;
      }
      options.onInvalidInput?.(value);
      return false;
    },
    setText(value) {
      text = value;
      invalidText = false;
      refresh();
    },
    commitText() {
      const result = parseText(text);
      if ("time" in result) {
        invalidText = false;
        control.set(result.time);
        text = formatValue(result.time);
        textValue = result.time;
        refresh();
        return true;
      }
      if (result.error === "empty") {
        invalidText = false;
        text = "";
        textValue = null;
        control.set(null);
        refresh();
        return true;
      }
      invalidText = true;
      options.onInvalidInput?.(text);
      refresh();
      return false;
    },
    handleTextKeyDown(key) {
      if (key === "Enter") {
        controller.commitText();
        controller.commit();
        return false;
      }
      if (key === "Escape") {
        const before = text;
        const value = control.get();
        text = value ? formatValue(value) : "";
        invalidText = false;
        refresh();
        return before !== text;
      }
      return false;
    },
    commit() {
      if (options.mode === "text") controller.commitText();
      const value = control.get();
      if (
        value &&
        state.validity === "valid" &&
        !sameNullable(value, lastCommitted)
      ) {
        lastCommitted = value;
        options.onValueCommit?.(value);
      }
    },
    clear() {
      if (options.disabled || options.readOnly) return;
      syncParts(null);
      focusedPart = visibleOrder()[0] as TimePartName;
      control.set(null);
      lastCommitted = null;
      refresh();
    },
    reset() {
      const value = options.defaultValue ?? null;
      syncParts(value);
      focusedPart = visibleOrder()[0] as TimePartName;
      control.set(value);
      lastCommitted = value;
      refresh();
    },
    getRootAttributes: () => ({
      role: "group",
      "data-chrono-time-input": true,
      "data-mode": state.mode,
      "data-disabled": state.disabled,
      "data-readonly": state.readOnly,
      "data-invalid": isTimeInvalid(state.validity),
      "aria-disabled": state.disabled ? "true" : undefined,
      dir: state.direction,
    }),
    getSegmentAttributes(segment) {
      if (segment.type === "literal") {
        return { "aria-hidden": "true", "data-chrono-literal": true };
      }
      return {
        role: "spinbutton",
        "aria-label": state.messages[segment.type],
        "aria-valuenow": segment.value ?? undefined,
        "aria-valuemin": segment.min,
        "aria-valuemax": segment.max,
        "aria-valuetext": segment.valueText,
        "aria-readonly": state.readOnly ? "true" : undefined,
        "aria-disabled": state.disabled ? "true" : undefined,
        "aria-required": state.required ? "true" : undefined,
        "aria-invalid": isTimeInvalid(state.validity) ? "true" : undefined,
        tabindex: state.disabled
          ? undefined
          : segment.type === state.focusedPart
            ? 0
            : -1,
        inputmode: segment.type === "dayPeriod" ? "text" : "numeric",
        "data-placeholder": segment.value === null,
        "data-invalid": isTimeInvalid(state.validity),
        "data-chrono-part": segment.type,
      };
    },
    getTextFieldAttributes: () => ({
      type: "text",
      autocomplete: "off",
      spellcheck: "false",
      placeholder: state.pattern,
      "aria-invalid": isTimeInvalid(state.validity) ? "true" : undefined,
      "aria-required": state.required ? "true" : undefined,
      "data-invalid": isTimeInvalid(state.validity),
      disabled: state.disabled,
      readonly: state.readOnly,
    }),
    getClearButtonAttributes: () => ({
      type: "button",
      "aria-label": state.messages.clear,
      "data-disabled": state.disabled || state.validity === "empty",
    }),
    destroy() {
      listeners.clear();
    },
  };
  return controller;
}
