import {
  type Attributes,
  type HiddenInput,
  createControllable,
  createId,
  getHiddenInputs,
} from "../../foundation/index.js";
import { sameDateTime } from "../compose.js";
import {
  type DateTimeRangeReason,
  checkDateTimeRange,
  getBounds,
} from "../constraints.js";
import type { DateTimeRangeValue, DateTimeValue } from "../types.js";
import {
  type DateTimeInputController,
  type DateTimeInputOptions,
  type DateTimeInputState,
  type DateTimeValidity,
  createDateTimeInputController,
} from "./datetime-input-controller.js";

export type DateTimeRangeInputOptions = Omit<
  DateTimeInputOptions,
  | "value"
  | "defaultValue"
  | "onValueChange"
  | "onValueCommit"
  | "name"
  | "onFocusEdge"
> & {
  value?: DateTimeRangeValue;
  defaultValue?: DateTimeRangeValue;
  onValueChange?: (value: DateTimeRangeValue) => void;
  onValueCommit?: (value: {
    start: NonNullable<DateTimeValue>;
    end: NonNullable<DateTimeValue>;
  }) => void;
  name?: string;
  startName?: string;
  endName?: string;
  /** Minutes. */
  minDuration?: number;
  maxDuration?: number;
};

export type DateTimeRangeValidity = DateTimeValidity | DateTimeRangeReason;

export type DateTimeRangeInputState = {
  id: string;
  value: DateTimeRangeValue;
  validity: DateTimeRangeValidity;
  start: DateTimeInputState;
  end: DateTimeInputState;
  duration: number | null;
  disabled: boolean;
  readOnly: boolean;
  hidden: HiddenInput[];
  messages: DateTimeInputState["messages"];
};

export type DateTimeRangeInputController = {
  getState(): DateTimeRangeInputState;
  subscribe(listener: (state: DateTimeRangeInputState) => void): () => void;
  setOptions(options: Partial<DateTimeRangeInputOptions>): void;
  getStart(): DateTimeInputController;
  getEnd(): DateTimeInputController;
  commit(): void;
  clear(): void;
  reset(): void;
  getRootAttributes(): Attributes;
  destroy(): void;
};

const sameRange = (a: DateTimeRangeValue, b: DateTimeRangeValue): boolean =>
  a === b ||
  (a !== null &&
    b !== null &&
    sameDateTime(a.start, b.start) &&
    sameDateTime(a.end, b.end));

/** Two date-time inputs in one group (plan 08 X10). */
export function createDateTimeRangeInputController(
  initial: DateTimeRangeInputOptions = {},
): DateTimeRangeInputController {
  let options = initial;
  const id = options.id ?? createId("chrono-datetime-range-input");
  const control = createControllable<DateTimeRangeValue>({
    value: options.value,
    defaultValue: options.defaultValue ?? null,
    onChange: (value) => options.onValueChange?.(value),
    equals: sameRange,
  });
  let lastCommitted: DateTimeRangeValue = control.get();
  const childOptions = (): DateTimeInputOptions => {
    const {
      value: _v,
      defaultValue: _d,
      onValueChange: _c,
      onValueCommit: _m,
      name: _n,
      startName: _s,
      endName: _e,
      minDuration: _a,
      maxDuration: _b,
      ...shared
    } = options;
    // The fields only format the hidden value; this range names the inputs.
    return {
      ...shared,
      name:
        options.name || options.startName || options.endName
          ? "value"
          : undefined,
    };
  };
  const combine = (
    start: DateTimeValue,
    end: DateTimeValue,
  ): DateTimeRangeValue =>
    start === null && end === null ? null : { start, end };
  const setSide = (side: "start" | "end", value: DateTimeValue): void => {
    const now = control.get();
    control.set(
      combine(
        side === "start" ? value : (now?.start ?? null),
        side === "end" ? value : (now?.end ?? null),
      ),
    );
    propagate();
    refresh();
  };
  const startCtl = createDateTimeInputController({
    ...childOptions(),
    id: `${id}-start`,
    value: control.get()?.start ?? null,
    defaultValue: undefined,
    onValueChange: (value) => setSide("start", value),
  });
  const endCtl = createDateTimeInputController({
    ...childOptions(),
    id: `${id}-end`,
    value: control.get()?.end ?? null,
    defaultValue: undefined,
    onValueChange: (value) => setSide("end", value),
  });
  function propagate(): void {
    const value = control.get();
    startCtl.setOptions({ value: value?.start ?? null });
    endCtl.setOptions({ value: value?.end ?? null });
  }
  let state: DateTimeRangeInputState;
  const listeners = new Set<(state: DateTimeRangeInputState) => void>();

  const compute = (): DateTimeRangeInputState => {
    const start = startCtl.getState();
    const end = endCtl.getState();
    let validity: DateTimeRangeValidity;
    let duration: number | null = null;
    if (start.validity === "empty" && end.validity === "empty")
      validity = "empty";
    else if (start.validity !== "valid" && start.validity !== "empty")
      validity = start.validity;
    else if (end.validity !== "valid" && end.validity !== "empty")
      validity = end.validity;
    else if (!start.value || !end.value) validity = "incomplete";
    else {
      const check = checkDateTimeRange(start.value, end.value, {
        minDuration: options.minDuration,
        maxDuration: options.maxDuration,
        bounds: getBounds({
          min: options.min,
          max: options.max,
          disablePast: options.disablePast,
          timeZone: options.timeZone,
          now: options.now,
        }),
      });
      validity = check.valid ? "valid" : check.reason;
      if (check.valid) duration = check.duration;
    }
    const value = control.get();
    const name = options.name;
    return {
      id,
      value,
      validity,
      start,
      end,
      duration,
      disabled: start.disabled,
      readOnly: start.readOnly,
      hidden: getHiddenInputs([
        [
          options.startName ?? (name ? `${name}-start` : undefined),
          start.hidden[0]?.value ?? null,
        ],
        [
          options.endName ?? (name ? `${name}-end` : undefined),
          end.hidden[0]?.value ?? null,
        ],
      ]),
      messages: start.messages,
    };
  };
  const refresh = (): void => {
    const next = compute();
    if (state && JSON.stringify(state) === JSON.stringify(next)) return;
    state = next;
    for (const listener of [...listeners]) listener(state);
  };
  state = compute();
  startCtl.subscribe(refresh);
  endCtl.subscribe(refresh);

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
      const shared = childOptions();
      // The hidden values belong to this range; the two fields carry no `name`.
      startCtl.setOptions({ ...shared, value: control.get()?.start ?? null });
      endCtl.setOptions({ ...shared, value: control.get()?.end ?? null });
      refresh();
    },
    getStart: () => startCtl,
    getEnd: () => endCtl,
    commit() {
      const value = control.get();
      if (
        state.validity === "valid" &&
        value?.start &&
        value.end &&
        !sameRange(value, lastCommitted)
      ) {
        lastCommitted = value;
        options.onValueCommit?.({ start: value.start, end: value.end });
      }
    },
    clear() {
      startCtl.clear();
      endCtl.clear();
      lastCommitted = null;
    },
    reset() {
      const value = options.defaultValue ?? null;
      control.set(value);
      propagate();
      startCtl.reset();
      endCtl.reset();
      lastCommitted = value;
      refresh();
    },
    getRootAttributes: () => ({
      role: "group",
      "data-chrono-datetime-range-input": true,
      "data-mode": state.start.mode,
      "data-disabled": state.disabled,
      "data-readonly": state.readOnly,
      "data-invalid": state.validity !== "valid" && state.validity !== "empty",
      "aria-disabled": state.disabled ? "true" : undefined,
      dir: state.start.direction,
    }),
    destroy() {
      listeners.clear();
      startCtl.destroy();
      endCtl.destroy();
    },
  };
}
