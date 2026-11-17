import {
  type Attributes,
  type DateTimeInput,
  type HiddenInput,
  type Messages,
  type PlainDate,
  type PlainTime,
  compare,
  createControllable,
  createId,
  defaultMessages,
  getHiddenInputs,
  getTimeZoneLabel,
  mergeMessages,
  nowZoned,
  toInstant,
} from "../../foundation/index.js";
import {
  type DateInputController,
  type DateInputOptions,
  type DateInputState,
  type SegmentView,
  createDateInputController,
} from "../../date/index.js";
import {
  type TimeInputController,
  type TimeInputOptions,
  type TimeInputState,
  type TimeSegmentView,
  createTimeInputController,
} from "../../time/index.js";
import {
  type Draft,
  type Zone,
  compose,
  decompose,
  sameDateTime,
} from "../compose.js";
import {
  type Bounds,
  getBounds,
  isDayDisabled,
  timeBoundsFor,
} from "../constraints.js";
import type { DateTimeValue } from "../types.js";
import { formatOffset } from "../zone/day-instants.js";
import { parseDateTime } from "./parse.js";

type Part = SegmentView["type"] | TimeSegmentView["type"];
type KeyMods = { shift: boolean; ctrl: boolean; meta: boolean };
export type DateTimeSegmentView = SegmentView | TimeSegmentView;

export type DateTimeInputOptions = {
  id?: string;
  value?: DateTimeValue;
  defaultValue?: DateTimeValue;
  onValueChange?: (value: DateTimeValue, info: { adjusted: boolean }) => void;
  /** On blur or Enter with a valid value. */
  onValueCommit?: (value: NonNullable<DateTimeValue>) => void;
  /** Segmented: one group of parts. Text: a date field and a time field. */
  mode?: "segmented" | "text";
  timeZone?: string;
  valueTimeZone?: string;
  disambiguation?: Zone["disambiguation"];
  granularity?: TimeInputOptions["granularity"];
  hourCycle?: TimeInputOptions["hourCycle"];
  step?: TimeInputOptions["step"];
  min?: DateTimeInput;
  max?: DateTimeInput;
  disablePast?: boolean;
  isDateDisabled?: (date: PlainDate) => boolean;
  isDateUnavailable?: (date: PlainDate) => boolean;
  isTimeDisabled?: (time: PlainTime, date: PlainDate) => boolean;
  onInvalidInput?: (text: string) => void;
  name?: string;
  /** Replaces the hidden input's value (for example to send UTC). */
  formValue?: (value: NonNullable<DateTimeValue>) => string;
  required?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  locale?: string;
  now?: number;
  messages?: Partial<Messages>;
  /** Internal: focus tried to leave the first or last part of the whole input. */
  onFocusEdge?: (direction: 1 | -1) => void;
};

export type DateTimeValidity =
  | "empty"
  | "incomplete"
  | "valid"
  | "invalid-date"
  | "before-min"
  | "after-max"
  | "disabled"
  | "unavailable"
  | "off-step"
  | "nonexistent-time";

export type DateTimeInputState = {
  id: string;
  mode: "segmented" | "text";
  /** Date parts, a separator and time parts, in one tab order (segmented mode). */
  segments: DateTimeSegmentView[];
  dateField: DateInputState;
  timeField: TimeInputState;
  value: DateTimeValue;
  validity: DateTimeValidity;
  adjusted: boolean;
  focusedPart: Part;
  /** "Vietnam Time" for a display zone, otherwise `null`. */
  zoneLabel: string | null;
  required: boolean;
  readOnly: boolean;
  disabled: boolean;
  direction: "ltr" | "rtl";
  locale?: string;
  messages: Messages;
  hidden: HiddenInput[];
};

export type DateTimeInputController = {
  getState(): DateTimeInputState;
  subscribe(listener: (state: DateTimeInputState) => void): () => void;
  setOptions(options: Partial<DateTimeInputOptions>): void;
  getDate(): DateInputController;
  getTime(): TimeInputController;
  handleKeyDown(part: Part, key: string, modifiers: KeyMods): boolean;
  focusPart(part: Part): void;
  settle(): void;
  /** A pasted date-time fills both parts; a bare date or time fills only its own. */
  paste(text: string): boolean;
  commit(): void;
  clear(): void;
  reset(): void;
  getRootAttributes(): Attributes;
  getSegmentAttributes(segment: DateTimeSegmentView): Attributes;
  getDateFieldAttributes(): Attributes;
  getTimeFieldAttributes(): Attributes;
  getClearButtonAttributes(): Attributes;
  destroy(): void;
};

const DATE_PARTS = new Set<Part>(["day", "month", "year"]);
const isDatePart = (part: Part): boolean => DATE_PARTS.has(part);

/** The text between the date and the time of a locale ("," + space, or a space). */
function separatorOf(locale: string | undefined): string {
  const parts = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    timeZone: "UTC",
  }).formatToParts(Date.UTC(2020, 0, 1, 15, 4));
  let sawDate = false;
  let text = "";
  for (const part of parts) {
    if (part.type === "day" || part.type === "month" || part.type === "year") {
      sawDate = true;
      text = "";
    } else if (sawDate && part.type === "literal") {
      text += part.value;
    } else if (part.type === "hour") break;
  }
  return text || " ";
}

const pad = (n: number) => String(n).padStart(2, "0");

/** A date and a time input composed by one controller (plan 08 X10). */
export function createDateTimeInputController(
  initial: DateTimeInputOptions = {},
): DateTimeInputController {
  let options = initial;
  const id = options.id ?? createId("chrono-datetime-input");
  const zone = (): Zone => ({
    timeZone: options.timeZone,
    valueTimeZone: options.valueTimeZone,
    disambiguation: options.disambiguation,
  });
  const bounds = (): Bounds =>
    getBounds({
      min: options.min,
      max: options.max,
      disablePast: options.disablePast,
      timeZone: options.timeZone,
      now: options.now,
    });
  const control = createControllable<DateTimeValue>({
    value: options.value,
    defaultValue: options.defaultValue ?? null,
    onChange: (value) =>
      options.onValueChange?.(value, { adjusted: lastAdjusted }),
    equals: sameDateTime,
  });
  let lastAdjusted = false;
  let draft: Draft = decompose(control.get(), zone());
  let focusedGroup: "date" | "time" = "date";
  let lastCommitted: DateTimeValue = control.get();

  const dateOptions = (): DateInputOptions => {
    const b = bounds();
    return {
      id: `${id}-date`,
      mode: options.mode,
      value: draft.date,
      onValueChange: (date) => setDraft({ date, time: draft.time }),
      locale: options.locale,
      timeZone: options.timeZone,
      now: options.now,
      min: b.min,
      max: b.max,
      isDateDisabled: (d) =>
        isDayDisabled(d, b) || (options.isDateDisabled?.(d) ?? false),
      isDateUnavailable: options.isDateUnavailable,
      onInvalidInput: options.onInvalidInput,
      required: options.required,
      readOnly: options.readOnly,
      disabled: options.disabled,
      messages: options.messages,
      onFocusEdge: (direction) => edge("date", direction),
    };
  };
  const timeOptions = (): TimeInputOptions => {
    const date = draft.date;
    const limit = date ? timeBoundsFor(date, bounds()) : {};
    return {
      id: `${id}-time`,
      mode: options.mode,
      value: draft.time,
      onValueChange: (time) => setDraft({ date: draft.date, time }),
      locale: options.locale,
      timeZone: options.timeZone,
      now: options.now,
      granularity: options.granularity,
      hourCycle: options.hourCycle,
      step: options.step,
      min: limit.min,
      max: limit.max,
      isTimeDisabled: date
        ? (t) => options.isTimeDisabled?.(t, date) ?? false
        : undefined,
      onInvalidInput: options.onInvalidInput,
      required: options.required,
      readOnly: options.readOnly,
      disabled: options.disabled,
      messages: options.messages,
      onFocusEdge: (direction) => edge("time", direction),
    };
  };
  const dateCtl = createDateInputController(dateOptions());
  const timeCtl = createTimeInputController(timeOptions());

  const firstLast = (group: "date" | "time", which: "first" | "last"): Part => {
    const parts = (
      group === "date"
        ? dateCtl.getState().segments
        : timeCtl.getState().segments
    )
      .filter((segment) => segment.type !== "literal")
      .map((segment) => segment.type as Part);
    return (which === "first" ? parts[0] : parts[parts.length - 1]) as Part;
  };
  function edge(group: "date" | "time", direction: 1 | -1): void {
    if (group === "date" && direction === 1) {
      focusedGroup = "time";
      timeCtl.focusPart(firstLast("time", "first") as never);
    } else if (group === "time" && direction === -1) {
      focusedGroup = "date";
      dateCtl.focusPart(firstLast("date", "last") as never);
    } else {
      options.onFocusEdge?.(direction);
    }
    emit();
  }

  let state: DateTimeInputState;
  const listeners = new Set<(state: DateTimeInputState) => void>();

  const evaluate = (): {
    value: DateTimeValue;
    adjusted: boolean;
    nonexistent: boolean;
  } => {
    const composed = compose(draft, zone());
    const b = bounds();
    let value = composed.value;
    if (value && draft.date && draft.time) {
      const wall = draft.date;
      const t = draft.time;
      void wall;
      const limit = timeBoundsFor(draft.date, b);
      if (limit.min && compare(t, limit.min) < 0) value = null;
      if (limit.max && compare(t, limit.max) > 0) value = null;
    }
    return {
      value,
      adjusted: composed.adjusted,
      nonexistent: composed.nonexistent,
    };
  };
  let current = evaluate();

  const validity = (): DateTimeValidity => {
    const d = dateCtl.getState().validity;
    const t = timeCtl.getState().validity;
    if (d === "empty" && t === "empty") return "empty";
    for (const v of [d, t]) {
      if (v !== "valid" && v !== "empty" && v !== "incomplete")
        return v as DateTimeValidity;
    }
    if (d !== "valid" || t !== "valid") return "incomplete";
    if (current.nonexistent) return "nonexistent-time";
    if (!current.value) {
      const wall =
        draft.time && draft.date ? timeBoundsFor(draft.date, bounds()) : {};
      return wall.min && draft.time && compare(draft.time, wall.min) < 0
        ? "before-min"
        : "after-max";
    }
    return "valid";
  };

  const formString = (value: NonNullable<DateTimeValue>): string => {
    if (options.formValue) return options.formValue(value);
    const seconds = options.granularity === "second";
    const base = `${value.year}-${pad(value.month)}-${pad(value.day)}T${pad(value.hour)}:${pad(value.minute)}${seconds ? `:${pad(value.second)}` : ""}`;
    return "timeZone" in value ? `${base}${formatOffset(value.offset)}` : base;
  };

  const compute = (): DateTimeInputState => {
    const dateState = dateCtl.getState();
    const timeState = timeCtl.getState();
    const messages = mergeMessages(defaultMessages, options.messages);
    const mode = options.mode ?? "segmented";
    const literal: SegmentView = {
      type: "literal",
      text: separatorOf(options.locale ?? undefined),
      value: null,
      placeholder: "",
      min: 0,
      max: 0,
      valueText: "",
      editable: false,
    };
    const value = control.get();
    const at =
      options.now ?? (value && "timeZone" in value ? toInstant(value) : 0);
    return {
      id,
      mode,
      segments: [...dateState.segments, literal, ...timeState.segments],
      dateField: dateState,
      timeField: timeState,
      value,
      validity: validity(),
      adjusted: current.adjusted,
      focusedPart:
        focusedGroup === "date" ? dateState.focusedPart : timeState.focusedPart,
      zoneLabel: options.timeZone
        ? getTimeZoneLabel(options.timeZone, options.locale, at)
        : null,
      required: options.required ?? false,
      readOnly: options.readOnly ?? false,
      disabled: options.disabled ?? false,
      direction: dateState.direction,
      locale: dateState.locale,
      messages,
      hidden: getHiddenInputs([
        [options.name, value ? formString(value) : null],
      ]),
    };
  };
  const emit = (): void => {
    const next = compute();
    if (state && JSON.stringify(state) === JSON.stringify(next)) return;
    state = next;
    for (const listener of [...listeners]) listener(state);
  };
  function setDraft(next: Draft): void {
    draft = next;
    current = evaluate();
    dateCtl.setOptions(dateOptions());
    timeCtl.setOptions(timeOptions());
    if (!sameDateTime(control.get(), current.value)) {
      lastAdjusted = current.adjusted;
      control.set(current.value);
    }
    emit();
  }
  state = compute();
  dateCtl.subscribe(emit);
  timeCtl.subscribe(emit);
  void nowZoned;

  const groupOf = (part: Part) => (isDatePart(part) ? dateCtl : timeCtl);
  const controller: DateTimeInputController = {
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
      if (!sameDateTime(current.value, control.get())) {
        draft = decompose(control.get(), zone());
      }
      current = evaluate();
      dateCtl.setOptions(dateOptions());
      timeCtl.setOptions(timeOptions());
      emit();
    },
    getDate: () => dateCtl,
    getTime: () => timeCtl,
    handleKeyDown(part, key, modifiers) {
      focusedGroup = isDatePart(part) ? "date" : "time";
      const group = groupOf(part) as unknown as {
        handleKeyDown(part: Part, key: string, modifiers: KeyMods): boolean;
      };
      return group.handleKeyDown(part, key, modifiers);
    },
    focusPart(part) {
      focusedGroup = isDatePart(part) ? "date" : "time";
      (groupOf(part) as unknown as { focusPart(part: Part): void }).focusPart(
        part,
      );
      emit();
    },
    settle() {
      dateCtl.settle();
      timeCtl.settle();
    },
    paste(text) {
      if (options.disabled || options.readOnly) return false;
      const result = parseDateTime(text, {
        locale: options.locale,
        timeZone: options.timeZone,
      });
      if ("error" in result) {
        options.onInvalidInput?.(text);
        return false;
      }
      setDraft({
        date: result.date ?? draft.date,
        time: result.time ?? draft.time,
      });
      return true;
    },
    commit() {
      dateCtl.commit();
      timeCtl.commit();
      const value = control.get();
      if (
        value &&
        state.validity === "valid" &&
        !sameDateTime(value, lastCommitted)
      ) {
        lastCommitted = value;
        options.onValueCommit?.(value);
      }
    },
    clear() {
      if (options.disabled || options.readOnly) return;
      dateCtl.clear();
      timeCtl.clear();
      focusedGroup = "date";
      draft = { date: null, time: null };
      lastCommitted = null;
      setDraft(draft);
    },
    reset() {
      const value = options.defaultValue ?? null;
      draft = decompose(value, zone());
      lastCommitted = value;
      dateCtl.reset();
      timeCtl.reset();
      control.set(value);
      setDraft(draft);
    },
    getRootAttributes: () => ({
      role: "group",
      "data-chrono-datetime-input": true,
      "data-mode": state.mode,
      "data-disabled": state.disabled,
      "data-readonly": state.readOnly,
      "data-invalid": state.validity !== "valid" && state.validity !== "empty",
      "data-adjusted": state.adjusted,
      "aria-disabled": state.disabled ? "true" : undefined,
      dir: state.direction,
    }),
    getSegmentAttributes(segment) {
      if (segment.type === "literal")
        return dateCtl.getSegmentAttributes(segment as SegmentView);
      const base =
        groupOf(segment.type as Part) === dateCtl
          ? dateCtl.getSegmentAttributes(segment as SegmentView)
          : timeCtl.getSegmentAttributes(segment as TimeSegmentView);
      return {
        ...base,
        // One tab stop for the whole group, not one per sub-controller.
        tabindex: state.disabled
          ? undefined
          : segment.type === state.focusedPart
            ? 0
            : -1,
      };
    },
    getDateFieldAttributes: () => ({
      ...dateCtl.getTextFieldAttributes(),
      "aria-label": state.messages.date,
    }),
    getTimeFieldAttributes: () => ({
      ...timeCtl.getTextFieldAttributes(),
      "aria-label": state.messages.time,
    }),
    getClearButtonAttributes: () => ({
      type: "button",
      "aria-label": state.messages.clear,
      "data-disabled": state.disabled || state.validity === "empty",
    }),
    destroy() {
      listeners.clear();
      dateCtl.destroy();
      timeCtl.destroy();
    },
  };
  return controller;
}
