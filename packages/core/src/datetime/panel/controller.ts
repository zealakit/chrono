import {
  type Attributes,
  type Availability,
  type AvailabilitySpec,
  type DateTimeInput,
  type Messages,
  compare,
  type PlainDate,
  type PlainTime,
  compileAvailability,
  createControllable,
  createId,
  defaultMessages,
  mergeMessages,
  toPlainTime,
} from "../../foundation/index.js";
import {
  type PanelController,
  type DatePanelOptions,
  type PanelState,
  createDatePanelController,
} from "../../date/index.js";
import {
  type TimePanelController,
  type TimePanelOptions,
  type TimePanelState,
  createTimePanelController,
} from "../../time/index.js";
import {
  type Composed,
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

type Inner<T> = Omit<
  T,
  "value" | "defaultValue" | "onValueChange" | "onValueCommit" | "min" | "max"
>;

export type DateTimePanelOptions = {
  id?: string;
  value?: DateTimeValue;
  defaultValue?: DateTimeValue;
  onValueChange?: (value: DateTimeValue, info: { adjusted: boolean }) => void;
  /** Fires when the time part commits while a date is chosen and the value is valid (X8). */
  onValueCommit?: (value: NonNullable<DateTimeValue>) => void;
  /** The zone the user sees and edits. Without it values are plain wall times. */
  timeZone?: string;
  /** The zone of the emitted value (the same instant). */
  valueTimeZone?: string;
  disambiguation?: Zone["disambiguation"];
  /** Fills the time when a date is picked first. */
  defaultTime?: DateTimeInput | string;
  min?: DateTimeInput;
  max?: DateTimeInput;
  disablePast?: boolean;
  isDateDisabled?: (date: PlainDate) => boolean;
  isDateUnavailable?: (date: PlainDate) => boolean;
  isTimeDisabled?: (time: PlainTime, date: PlainDate) => boolean;
  isTimeUnavailable?: (time: PlainTime, date: PlainDate) => boolean;
  /** Availability model (plan 11 V7–V8): dates and times of the selected day. */
  availability?: AvailabilitySpec | Availability;
  date?: Inner<DatePanelOptions>;
  time?: Inner<TimePanelOptions>;
  locale?: string;
  now?: number;
  readOnly?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  messages?: Partial<Messages>;
};

export type DateTimePanelState = {
  id: string;
  value: DateTimeValue;
  draft: Draft;
  adjusted: boolean;
  nonexistent: boolean;
  date: PanelState;
  time: TimePanelState;
  messages: Messages;
};

export type DateTimePanelController = {
  getState(): DateTimePanelState;
  subscribe(listener: (state: DateTimePanelState) => void): () => void;
  setOptions(options: Partial<DateTimePanelOptions>): void;
  getDate(): PanelController<unknown, DatePanelOptions>;
  getTime(): TimePanelController<unknown, TimePanelOptions>;
  clear(): void;
  commit(): void;
  getRootAttributes(): Attributes;
  destroy(): void;
};

/** Date and time panels composed by one controller (plan 08 X6–X8). */
export function createDateTimePanelController(
  initial: DateTimePanelOptions = {},
): DateTimePanelController {
  let options = initial;
  const id = options.id ?? createId("chrono-datetime-panel");
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
  let composed: Composed = compose(draft, zone());

  /** A time is allowed on a date when the bounds and the app's rule accept it. */
  const timeAllowed = (date: PlainDate, time: PlainTime): boolean => {
    const limit = timeBoundsFor(date, bounds());
    if (limit.min && compare(time, limit.min) < 0) return false;
    if (limit.max && compare(time, limit.max) > 0) return false;
    return !options.isTimeDisabled?.(time, date);
  };
  const defaultTime = (): PlainTime | null =>
    options.defaultTime === undefined
      ? null
      : toPlainTime(options.defaultTime as never);

  const availabilityOf = (): Availability | undefined =>
    options.availability === undefined
      ? undefined
      : compileAvailability(options.availability, {
          timeZone: options.timeZone,
          now: options.now,
        });
  const dateOptions = (): DatePanelOptions => {
    const b = bounds();
    return {
      ...options.date,
      id: `${id}-date`,
      locale: options.locale,
      timeZone: options.timeZone ?? options.date?.timeZone,
      now: options.now,
      min: b.min,
      max: b.max,
      isDateDisabled: (date) =>
        isDayDisabled(date, b) || (options.isDateDisabled?.(date) ?? false),
      isDateUnavailable: options.isDateUnavailable,
      availability: options.availability,
      value: draft.date,
      onValueChange: (date) => setDate(date),
      readOnly: options.readOnly,
      disabled: options.disabled,
      autoFocus: options.autoFocus,
      messages: options.messages,
    };
  };
  const timeOptions = (): TimePanelOptions => {
    const limit = draft.date ? timeBoundsFor(draft.date, bounds()) : {};
    const date = draft.date;
    return {
      ...options.time,
      id: `${id}-time`,
      locale: options.locale,
      timeZone: options.timeZone ?? options.time?.timeZone,
      now: options.now,
      min: limit.min,
      max: limit.max,
      isTimeDisabled: date
        ? (time) => options.isTimeDisabled?.(time, date) ?? false
        : undefined,
      isTimeUnavailable: date
        ? (time) => {
            const availability = availabilityOf();
            return (
              (options.isTimeUnavailable?.(time, date) ?? false) ||
              (availability ? !availability.isTimeAvailable(date, time) : false)
            );
          }
        : undefined,
      value: draft.time,
      onValueChange: (time) => setTime(time),
      onValueCommit: () => commitNow(),
      readOnly: options.readOnly,
      disabled: options.disabled,
      messages: options.messages,
    };
  };

  const dateCtl = createDatePanelController(dateOptions());
  const timeCtl = createTimePanelController(timeOptions());
  let state: DateTimePanelState;
  const listeners = new Set<(state: DateTimePanelState) => void>();

  const compute = (): DateTimePanelState => ({
    id,
    value: control.get(),
    draft,
    adjusted: composed.adjusted,
    nonexistent: composed.nonexistent,
    date: dateCtl.getState(),
    time: timeCtl.getState(),
    messages: mergeMessages(defaultMessages, options.messages),
  });
  const emit = (): void => {
    const next = compute();
    if (state && JSON.stringify(state) === JSON.stringify(next)) return;
    state = next;
    for (const listener of [...listeners]) listener(state);
  };

  /** Push the draft into the composed controllers and the value. */
  const update = (): void => {
    dateCtl.setOptions(dateOptions());
    timeCtl.setOptions(timeOptions());
    composed = compose(draft, zone());
    const allowed =
      draft.date && draft.time ? timeAllowed(draft.date, draft.time) : false;
    const value = allowed ? composed.value : null;
    if (!sameDateTime(control.get(), value)) {
      lastAdjusted = composed.adjusted;
      control.set(value);
    }
    emit();
  };
  function setDate(date: PlainDate | null): void {
    draft = { date, time: draft.time };
    if (date && !draft.time) {
      const fill = defaultTime();
      if (fill) draft = { date, time: fill };
    }
    update();
  }
  function setTime(time: PlainTime | null): void {
    draft = { date: draft.date, time };
    update();
  }
  function commitNow(): void {
    const value = control.get();
    if (value && draft.date) options.onValueCommit?.(value);
  }
  state = compute();
  dateCtl.subscribe(emit);
  timeCtl.subscribe(emit);

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
      const current = control.get();
      if (!sameDateTime(composed.value, current)) {
        draft = current
          ? decompose(current, zone())
          : { date: null, time: null };
      }
      update();
    },
    getDate: () => dateCtl as never,
    getTime: () => timeCtl as never,
    clear() {
      if (options.disabled || options.readOnly) return;
      draft = { date: null, time: null };
      timeCtl.clear();
      update();
    },
    commit: commitNow,
    getRootAttributes: () => ({
      role: "group",
      "data-chrono-datetime-panel": true,
      "data-adjusted": state.adjusted,
      "data-disabled": options.disabled ?? false,
      "data-readonly": options.readOnly ?? false,
    }),
    destroy() {
      listeners.clear();
      dateCtl.destroy();
      timeCtl.destroy();
    },
  };
}
