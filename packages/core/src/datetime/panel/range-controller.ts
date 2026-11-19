import {
  type Attributes,
  type DateTimeInput,
  type Messages,
  type PlainDate,
  type PlainDateTime,
  type PlainTime,
  type ZonedDateTime,
  createControllable,
  createId,
  defaultMessages,
  mergeMessages,
} from "../../foundation/index.js";
import {
  type DateRangePanelOptions,
  type DateRangeValue,
  type PanelController,
  type PanelState,
  createDateRangePanelController,
} from "../../date/index.js";
import {
  type TimePanelController,
  type TimePanelOptions,
  type TimePanelState,
  createTimePanelController,
} from "../../time/index.js";
import { type Zone, compose, decompose, sameDateTime } from "../compose.js";
import {
  type Bounds,
  type DateTimeRangeReason,
  checkDateTimeRange,
  getBounds,
  isDayDisabled,
  timeBoundsFor,
} from "../constraints.js";
import type { DateTimeRangeValue } from "../types.js";

type Inner<T> = Omit<
  T,
  "value" | "defaultValue" | "onValueChange" | "onValueCommit" | "min" | "max"
>;
type Value = PlainDateTime | ZonedDateTime;

export type DateTimeRangePanelOptions = {
  id?: string;
  value?: DateTimeRangeValue;
  defaultValue?: DateTimeRangeValue;
  onValueChange?: (value: DateTimeRangeValue) => void;
  /** Fires when the end time commits and the range is valid (X9). */
  onValueCommit?: (value: { start: Value; end: Value }) => void;
  timeZone?: string;
  valueTimeZone?: string;
  disambiguation?: Zone["disambiguation"];
  /** Minutes. */
  minDuration?: number;
  maxDuration?: number;
  min?: DateTimeInput;
  max?: DateTimeInput;
  disablePast?: boolean;
  isDateDisabled?: (date: PlainDate) => boolean;
  isDateUnavailable?: (date: PlainDate) => boolean;
  isTimeDisabled?: (time: PlainTime, date: PlainDate) => boolean;
  date?: Inner<DateRangePanelOptions>;
  startTime?: Inner<TimePanelOptions>;
  endTime?: Inner<TimePanelOptions>;
  onInvalidRange?: (reason: DateTimeRangeReason) => void;
  locale?: string;
  now?: number;
  readOnly?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  messages?: Partial<Messages>;
};

export type DateTimeRangePanelState = {
  id: string;
  value: DateTimeRangeValue;
  draft: {
    range: DateRangeValue;
    startTime: PlainTime | null;
    endTime: PlainTime | null;
  };
  validity: "empty" | "incomplete" | "valid" | DateTimeRangeReason;
  duration: number | null;
  date: PanelState;
  startTime: TimePanelState;
  endTime: TimePanelState;
  messages: Messages;
};

export type DateTimeRangePanelController = {
  getState(): DateTimeRangePanelState;
  subscribe(listener: (state: DateTimeRangePanelState) => void): () => void;
  setOptions(options: Partial<DateTimeRangePanelOptions>): void;
  getDate(): PanelController<unknown, DateRangePanelOptions>;
  getStartTime(): TimePanelController<unknown, TimePanelOptions>;
  getEndTime(): TimePanelController<unknown, TimePanelOptions>;
  clear(): void;
  commit(): void;
  getRootAttributes(): Attributes;
  destroy(): void;
};

const sameRange = (a: DateTimeRangeValue, b: DateTimeRangeValue): boolean =>
  a === b ||
  (a !== null &&
    b !== null &&
    sameDateTime(a.start, b.start) &&
    sameDateTime(a.end, b.end));

/** A date range panel and two time panels composed by one controller (plan 08 X9). */
export function createDateTimeRangePanelController(
  initial: DateTimeRangePanelOptions = {},
): DateTimeRangePanelController {
  let options = initial;
  const id = options.id ?? createId("chrono-datetime-range-panel");
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

  const control = createControllable<DateTimeRangeValue>({
    value: options.value,
    defaultValue: options.defaultValue ?? null,
    onChange: (value) => options.onValueChange?.(value),
    equals: sameRange,
  });
  type Draft = DateTimeRangePanelState["draft"];
  const initialDraft = (value: DateTimeRangeValue): Draft => {
    const start = decompose(value?.start ?? null, zone());
    const end = decompose(value?.end ?? null, zone());
    return {
      range: value ? { start: start.date, end: end.date } : null,
      startTime: start.time,
      endTime: end.time,
    };
  };
  let draft = initialDraft(control.get());

  const composeBoth = () => {
    const start = compose(
      { date: draft.range?.start ?? null, time: draft.startTime },
      zone(),
    ).value;
    const end = compose(
      { date: draft.range?.end ?? null, time: draft.endTime },
      zone(),
    ).value;
    return { start, end };
  };
  const checkNow = (start: Value, end: Value) =>
    checkDateTimeRange(start, end, {
      minDuration: options.minDuration,
      maxDuration: options.maxDuration,
      bounds: bounds(),
    });
  /** The end time options that would break the range are disabled (X9). */
  const endBreaks = (time: PlainTime): boolean => {
    const date = draft.range?.end;
    const { start } = composeBoth();
    if (!date || !start) return false;
    const end = compose({ date, time }, zone()).value;
    return end ? !checkNow(start, end).valid : false;
  };
  const timeOpts = (
    kind: "start" | "end",
    date: PlainDate | null | undefined,
    time: PlainTime | null,
    user?: Inner<TimePanelOptions>,
  ): TimePanelOptions => {
    const limit = date ? timeBoundsFor(date, bounds()) : {};
    return {
      ...user,
      id: `${id}-${kind}-time`,
      locale: options.locale,
      timeZone: options.timeZone,
      now: options.now,
      min: limit.min,
      max: limit.max,
      isTimeDisabled: (t) =>
        (date ? options.isTimeDisabled?.(t, date) : false) ||
        (kind === "end" && endBreaks(t)),
      value: time,
      onValueChange: (next) => {
        draft =
          kind === "start"
            ? { ...draft, startTime: next }
            : { ...draft, endTime: next };
        update();
      },
      onValueCommit: kind === "end" ? () => commitNow() : undefined,
      readOnly: options.readOnly,
      disabled: options.disabled,
      messages: options.messages,
    };
  };
  const dateOpts = (): DateRangePanelOptions => {
    const b = bounds();
    return {
      ...options.date,
      id: `${id}-date`,
      locale: options.locale,
      timeZone: options.timeZone,
      now: options.now,
      min: b.min,
      max: b.max,
      isDateDisabled: (d) =>
        isDayDisabled(d, b) || (options.isDateDisabled?.(d) ?? false),
      isDateUnavailable: options.isDateUnavailable,
      value: draft.range,
      onValueChange: (range) => {
        draft = { ...draft, range };
        update();
      },
      readOnly: options.readOnly,
      disabled: options.disabled,
      autoFocus: options.autoFocus,
      messages: options.messages,
    };
  };

  const dateCtl = createDateRangePanelController(dateOpts());
  const startCtl = createTimePanelController(
    timeOpts("start", draft.range?.start, draft.startTime, options.startTime),
  );
  const endCtl = createTimePanelController(
    timeOpts("end", draft.range?.end, draft.endTime, options.endTime),
  );
  let state: DateTimeRangePanelState;
  const listeners = new Set<(state: DateTimeRangePanelState) => void>();

  const evaluate = (): {
    value: DateTimeRangeValue;
    validity: DateTimeRangePanelState["validity"];
    duration: number | null;
  } => {
    const { start, end } = composeBoth();
    const filled = [
      draft.range?.start,
      draft.range?.end,
      draft.startTime,
      draft.endTime,
    ].filter(Boolean).length;
    if (filled === 0) return { value: null, validity: "empty", duration: null };
    if (!start || !end)
      return { value: null, validity: "incomplete", duration: null };
    const check = checkNow(start, end);
    return check.valid
      ? { value: { start, end }, validity: "valid", duration: check.duration }
      : { value: null, validity: check.reason, duration: null };
  };
  let current = evaluate();

  const compute = (): DateTimeRangePanelState => ({
    id,
    value: control.get(),
    draft,
    validity: current.validity,
    duration: current.duration,
    date: dateCtl.getState(),
    startTime: startCtl.getState(),
    endTime: endCtl.getState(),
    messages: mergeMessages(defaultMessages, options.messages),
  });
  const emit = (): void => {
    const next = compute();
    if (state && JSON.stringify(state) === JSON.stringify(next)) return;
    state = next;
    for (const listener of [...listeners]) listener(state);
  };
  function update(): void {
    dateCtl.setOptions(dateOpts());
    startCtl.setOptions(
      timeOpts("start", draft.range?.start, draft.startTime, options.startTime),
    );
    endCtl.setOptions(
      timeOpts("end", draft.range?.end, draft.endTime, options.endTime),
    );
    current = evaluate();
    if (!sameRange(control.get(), current.value)) control.set(current.value);
    emit();
  }
  function commitNow(): void {
    const value = control.get();
    if (value?.start && value.end) {
      options.onValueCommit?.({ start: value.start, end: value.end });
    } else if (
      current.validity !== "empty" &&
      current.validity !== "incomplete" &&
      current.validity !== "valid"
    ) {
      options.onInvalidRange?.(current.validity);
    }
  }
  state = compute();
  dateCtl.subscribe(emit);
  startCtl.subscribe(emit);
  endCtl.subscribe(emit);

  return {
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
      if (!sameRange(current.value, control.get()))
        draft = initialDraft(control.get());
      update();
    },
    getDate: () => dateCtl as never,
    getStartTime: () => startCtl as never,
    getEndTime: () => endCtl as never,
    clear() {
      if (options.disabled || options.readOnly) return;
      draft = { range: null, startTime: null, endTime: null };
      startCtl.clear();
      endCtl.clear();
      update();
    },
    commit: commitNow,
    getRootAttributes: () => ({
      role: "group",
      "data-chrono-datetime-panel": "range",
      "data-disabled": options.disabled ?? false,
      "data-readonly": options.readOnly ?? false,
    }),
    destroy() {
      listeners.clear();
      dateCtl.destroy();
      startCtl.destroy();
      endCtl.destroy();
    },
  };
}
