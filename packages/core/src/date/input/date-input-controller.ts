import {
  type Attributes,
  type DateConstraints,
  type DateInput,
  type HiddenInput,
  type Messages,
  type PlainDate,
  type SegmentDef,
  type SegmentValue,
  backspace,
  createControllable,
  createId,
  daysInMonth,
  defaultMessages,
  emptySegment,
  formatDate,
  getDateFormatPattern,
  getDatePartOrder,
  getHiddenInputs,
  getMonthNames,
  getTextDirection,
  isSameDay,
  isValidDate,
  mergeMessages,
  plainDate,
  resolveLocale,
  segmentOf,
  stepSegment,
  toIsoString,
  toLatinDigits,
  toLocaleDigits,
  toPlainDate,
  today as readToday,
  typeDigit,
} from "../../foundation/index.js";
import type { DateValue, PartName } from "../types.js";
import {
  type ParseContext,
  type ParseResult,
  parseDate,
  resolveTwoDigitYear,
} from "./parse.js";
import { type DateValidity, getValidity, isInvalid } from "./validity.js";

export type FormatContext = { locale?: string };

export type DateInputOptions = {
  id?: string;
  value?: DateValue;
  defaultValue?: DateValue;
  onValueChange?: (value: DateValue) => void;
  /** On blur or Enter with a valid value. */
  onValueCommit?: (value: PlainDate) => void;
  mode?: "segmented" | "text";
  /** The value ↑/↓ starts from on an empty part (default today). */
  placeholderValue?: DateInput;
  parse?: (text: string, context: ParseContext) => PlainDate | null;
  format?: (date: PlainDate, context: FormatContext) => string;
  onInvalidInput?: (text: string) => void;
  name?: string;
  required?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  min?: DateInput;
  max?: DateInput;
  isDateDisabled?: (date: PlainDate) => boolean;
  isDateUnavailable?: (date: PlainDate) => boolean;
  locale?: string;
  timeZone?: string;
  now?: number;
  messages?: Partial<Messages>;
};

export type SegmentView = {
  type: PartName | "literal";
  text: string;
  value: number | null;
  placeholder: string;
  min: number;
  max: number;
  valueText: string;
  editable: boolean;
};

export type DateInputState = {
  id: string;
  mode: "segmented" | "text";
  segments: SegmentView[];
  text: string;
  value: DateValue;
  validity: DateValidity;
  /** The part that holds the tab stop (and receives focus after typing). */
  focusedPart: PartName;
  /** Text-mode hint such as `dd/mm/yyyy`. */
  pattern: string;
  required: boolean;
  readOnly: boolean;
  disabled: boolean;
  direction: "ltr" | "rtl";
  locale?: string;
  messages: Messages;
  hidden: HiddenInput[];
};

export type KeyModifiers = { shift: boolean; ctrl: boolean; meta: boolean };

export type DateInputController = {
  getState(): DateInputState;
  subscribe(listener: (state: DateInputState) => void): () => void;
  setOptions(options: Partial<DateInputOptions>): void;
  /** Keyboard input on a segment. Returns true when the key was consumed. */
  handleKeyDown(part: PartName, key: string, modifiers: KeyModifiers): boolean;
  focusPart(part: PartName): void;
  /** Finish pending typing (a 2-digit year). Call when focus leaves a part. */
  settle(): void;
  paste(text: string): boolean;
  setText(text: string): void;
  /** Text mode: parse on blur, Enter and paste. Returns true when the text became a date or was empty. */
  commitText(): boolean;
  /** Fire `onValueCommit` for a valid value (blur, Enter). */
  commit(): void;
  clear(): void;
  /** Restore `defaultValue` (form reset). */
  reset(): void;
  handleTextKeyDown(key: string): boolean;
  getRootAttributes(): Attributes;
  getSegmentAttributes(segment: SegmentView): Attributes;
  getTextFieldAttributes(): Attributes;
  getClearButtonAttributes(): Attributes;
  destroy(): void;
};

const PARTS: readonly PartName[] = ["day", "month", "year"];
const sameNullable = (a: DateValue, b: DateValue): boolean =>
  a === b || (a !== null && b !== null && isSameDay(a, b));

type Parts = Record<PartName, SegmentValue>;

export function createDateInputController(
  initial: DateInputOptions = {},
): DateInputController {
  let options = initial;
  const id = options.id ?? createId("chrono-date-input");
  const todayNow = (): PlainDate => readToday(options.timeZone, options.now);
  const bound = (value: DateInput | undefined): PlainDate | undefined =>
    value === undefined ? undefined : toPlainDate(value, options.timeZone);
  const constraints = (): DateConstraints => ({
    min: bound(options.min),
    max: bound(options.max),
    isDateDisabled: options.isDateDisabled,
    isDateUnavailable: options.isDateUnavailable,
  });
  const localeOf = (): string | undefined =>
    options.locale === undefined ? undefined : resolveLocale(options.locale);

  const control = createControllable<DateValue>({
    value: options.value,
    defaultValue: options.defaultValue ?? null,
    onChange: (value) => options.onValueChange?.(value),
    equals: sameNullable,
  });

  let parts: Parts = {
    day: emptySegment,
    month: emptySegment,
    year: emptySegment,
  };
  let text = "";
  /** The value `text` currently stands for; a different value from outside re-formats it. */
  let textValue: DateValue = null;
  let invalidText = false;
  let focusedPart: PartName = getDatePartOrder(localeOf()).order[0] as PartName;
  let lastCommitted: DateValue = control.get();
  let state: DateInputState;
  const listeners = new Set<(state: DateInputState) => void>();

  const formatValue = (date: PlainDate): string =>
    options.format
      ? options.format(date, { locale: localeOf() })
      : formatDate(date, localeOf(), {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
  const parseContext = (): ParseContext => ({
    locale: localeOf(),
    today: todayNow(),
  });
  const parseText = (value: string): ParseResult => {
    if (options.parse) {
      if (value.trim() === "") return { error: "empty" };
      const date = options.parse(value, parseContext());
      return date ? { date } : { error: "unparseable" };
    }
    return parseDate(value, parseContext());
  };

  const syncParts = (value: DateValue): void => {
    parts = value
      ? {
          day: segmentOf(value.day),
          month: segmentOf(value.month),
          year: segmentOf(value.year),
        }
      : { day: emptySegment, month: emptySegment, year: emptySegment };
    text = value ? formatValue(value) : "";
    textValue = value;
    invalidText = false;
  };
  syncParts(control.get());

  const derive = (): DateValue => {
    const { day, month, year } = parts;
    if (day.value === null || month.value === null || year.value === null) {
      return null;
    }
    return isValidDate(year.value, month.value, day.value)
      ? plainDate(year.value, month.value, day.value)
      : null;
  };
  const filledCount = (): number =>
    PARTS.filter((part) => parts[part].value !== null).length;

  const def = (part: PartName): SegmentDef => {
    if (part === "month") return { min: 1, max: 12, maxDigits: 2, pageStep: 3 };
    if (part === "year")
      return { min: 1, max: 9999, maxDigits: 4, pageStep: 10 };
    const { month, year } = parts;
    const max =
      month.value === null ? 31 : daysInMonth(year.value ?? 2000, month.value);
    return { min: 1, max, maxDigits: 2, pageStep: 7 };
  };

  const validityNow = (): DateValidity => {
    if (options.mode === "text") {
      if (text.trim() === "") return "empty";
      if (invalidText) return "invalid-date";
      const value = control.get();
      return value ? getValidity(3, value, constraints()) : "invalid-date";
    }
    const date = derive();
    return getValidity(filledCount(), date, constraints());
  };

  const compute = (): DateInputState => {
    const locale = localeOf();
    const messages = mergeMessages(defaultMessages, options.messages);
    const { order, separators, prefix, suffix } = getDatePartOrder(locale);
    const names = getMonthNames(locale, "long");
    const placeholders: Record<PartName, string> = {
      day: messages.placeholderDay,
      month: messages.placeholderMonth,
      year: messages.placeholderYear,
    };
    const display = (part: PartName): string => {
      const segment = parts[part];
      if (segment.buffer !== "") return toLocaleDigits(segment.buffer, locale);
      if (segment.value === null) return placeholders[part];
      return toLocaleDigits(
        String(segment.value).padStart(part === "year" ? 4 : 2, "0"),
        locale,
      );
    };
    const literal = (value: string): SegmentView => ({
      type: "literal",
      text: value,
      value: null,
      placeholder: "",
      min: 0,
      max: 0,
      valueText: "",
      editable: false,
    });
    const segments: SegmentView[] = [];
    if (prefix) segments.push(literal(prefix));
    order.forEach((part, index) => {
      const segment = parts[part];
      const bounds = def(part);
      const shown = display(part);
      segments.push({
        type: part,
        text: shown,
        value: segment.value,
        placeholder: placeholders[part],
        min: bounds.min,
        max: bounds.max,
        valueText:
          segment.value === null
            ? messages.empty
            : part === "month"
              ? (names[segment.value - 1] as string)
              : shown,
        editable: true,
      });
      const separator = separators[index];
      if (index < 2 && separator) segments.push(literal(separator));
    });
    if (suffix) segments.push(literal(suffix));
    const value = control.get();
    return {
      id,
      mode: options.mode ?? "segmented",
      segments,
      text,
      value,
      validity: validityNow(),
      focusedPart,
      pattern: getDateFormatPattern(locale, messages),
      required: options.required ?? false,
      readOnly: options.readOnly ?? false,
      disabled: options.disabled ?? false,
      direction: getTextDirection(locale),
      locale,
      messages,
      hidden: getHiddenInputs([
        [options.name, value ? toIsoString(value) : null],
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

  /** Push the parts into the value after an edit. */
  const afterEdit = (): void => {
    const next = derive();
    if (!sameNullable(next, control.get())) control.set(next);
    refresh();
  };

  const orderParts = (): PartName[] => [...getDatePartOrder(localeOf()).order];

  const settlePart = (part: PartName): void => {
    const segment = parts[part];
    if (part !== "year" || segment.buffer === "") return;
    const typed = Number(segment.buffer);
    const resolved =
      segment.buffer.length === 2
        ? resolveTwoDigitYear(typed, todayNow().year)
        : typed;
    parts = {
      ...parts,
      year: {
        value: resolved >= 1 && resolved <= 9999 ? resolved : null,
        buffer: "",
      },
    };
  };
  const settleAll = (): void => {
    for (const part of PARTS) settlePart(part);
  };

  const moveFocus = (part: PartName, step: 1 | -1): void => {
    const list = orderParts();
    const index = list.indexOf(part) + step;
    const target = list[index];
    if (target) focusedPart = target;
  };

  const setSegment = (part: PartName, segment: SegmentValue): void => {
    parts = { ...parts, [part]: segment };
  };

  const controller: DateInputController = {
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
        if (!sameNullable(textValue, control.get())) {
          syncParts(control.get());
        }
      } else if (!sameNullable(derive(), control.get())) {
        syncParts(control.get());
      }
      refresh();
    },
    focusPart(part) {
      if (focusedPart !== part) {
        focusedPart = part;
        refresh();
      }
    },
    settle() {
      settleAll();
      afterEdit();
    },
    handleKeyDown(part, key, modifiers) {
      if (options.disabled) return false;
      if (modifiers.ctrl || modifiers.meta) return false;
      const rtl = state.direction === "rtl";
      if (key === "ArrowLeft" || key === "ArrowRight") {
        settlePart(part);
        moveFocus(part, (key === "ArrowRight") !== rtl ? 1 : -1);
        afterEdit();
        return true;
      }
      if (key === "Enter") {
        settleAll();
        afterEdit();
        controller.commit();
        return false;
      }
      if (options.readOnly) return false;
      const latin = toLatinDigits(key, localeOf());
      if (/^\d$/.test(latin)) {
        const result = typeDigit(def(part), parts[part], Number(latin));
        let segment = result.segment;
        // A year is pending until it has four digits or is settled on blur.
        if (part === "year" && segment.buffer.length < 4) {
          segment = { value: null, buffer: segment.buffer };
        }
        setSegment(part, segment);
        if (result.advance) {
          settlePart(part);
          moveFocus(part, 1);
        }
        afterEdit();
        return true;
      }
      const pv = toPlainDate(
        options.placeholderValue ?? todayNow(),
        options.timeZone,
      );
      const bounds = def(part);
      if (
        key === "ArrowUp" ||
        key === "ArrowDown" ||
        key === "PageUp" ||
        key === "PageDown"
      ) {
        settlePart(part);
        const direction = key === "ArrowUp" || key === "PageUp" ? 1 : -1;
        const amount = key.startsWith("Page") ? bounds.pageStep : 1;
        const wasComplete = derive() !== null;
        setSegment(
          part,
          stepSegment(bounds, parts[part], direction * amount, pv[part]),
        );
        if (wasComplete && part !== "day") {
          const { day, month, year } = parts;
          const limit = daysInMonth(year.value ?? 2000, month.value ?? 1);
          if ((day.value as number) > limit)
            setSegment("day", segmentOf(limit));
        }
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
          key === "Backspace" ? backspace(parts[part]) : emptySegment,
        );
        afterEdit();
        return true;
      }
      return false;
    },
    paste(value) {
      if (options.disabled || options.readOnly) return false;
      const result = parseText(value);
      if ("date" in result) {
        syncParts(result.date);
        invalidText = false;
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
      if ("date" in result) {
        invalidText = false;
        control.set(result.date);
        text = formatValue(result.date);
        textValue = result.date;
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
      else {
        settleAll();
        afterEdit();
      }
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
      focusedPart = orderParts()[0] as PartName;
      control.set(null);
      lastCommitted = null;
      refresh();
    },
    reset() {
      const value = options.defaultValue ?? null;
      syncParts(value);
      focusedPart = orderParts()[0] as PartName;
      control.set(value);
      lastCommitted = value;
      refresh();
    },

    getRootAttributes: () => ({
      role: "group",
      "data-chrono-date-input": true,
      "data-mode": state.mode,
      "data-disabled": state.disabled,
      "data-readonly": state.readOnly,
      "data-invalid": isInvalid(state.validity),
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
        "aria-invalid": isInvalid(state.validity) ? "true" : undefined,
        tabindex: state.disabled
          ? undefined
          : segment.type === state.focusedPart
            ? 0
            : -1,
        inputmode: "numeric",
        "data-placeholder":
          segment.value === null && segment.text === segment.placeholder,
        "data-invalid": isInvalid(state.validity),
        "data-chrono-part": segment.type,
      };
    },
    getTextFieldAttributes: () => ({
      type: "text",
      autocomplete: "off",
      spellcheck: "false",
      placeholder: state.pattern,
      "aria-invalid": isInvalid(state.validity) ? "true" : undefined,
      "aria-required": state.required ? "true" : undefined,
      "data-invalid": isInvalid(state.validity),
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
