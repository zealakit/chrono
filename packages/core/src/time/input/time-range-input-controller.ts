import {
  type Attributes,
  type HiddenInput,
  type PlainTime,
  createControllable,
  createId,
  getHiddenInputs,
  isSameTime,
} from "../../foundation/index.js";
import {
  type TimeRangeInvalidReason,
  type TimeRangeLimits,
  checkTimeRangeValue,
} from "../selection/range.js";
import type { TimeRangeValue, TimeValue } from "../types.js";
import {
  type TimeInputController,
  type TimeInputOptions,
  type TimeInputState,
  createTimeInputController,
} from "./time-input-controller.js";
import { type TimeValidity, isTimeInvalid } from "./validity.js";

export type TimeRangeInputOptions = Omit<
  TimeInputOptions,
  "value" | "defaultValue" | "onValueChange" | "onValueCommit" | "name"
> & {
  value?: TimeRangeValue;
  defaultValue?: TimeRangeValue;
  onValueChange?: (value: TimeRangeValue) => void;
  onValueCommit?: (value: { start: PlainTime; end: PlainTime }) => void;
  name?: string;
  startName?: string;
  endName?: string;
  allowOvernight?: boolean;
  /** Minutes. */
  minDuration?: number;
  maxDuration?: number;
};

export type TimeRangeValidity = TimeValidity | TimeRangeInvalidReason;

export type TimeRangeInputState = {
  id: string;
  value: TimeRangeValue;
  validity: TimeRangeValidity;
  start: TimeInputState;
  end: TimeInputState;
  /** Minutes, when the range is valid. */
  duration: number | null;
  crossesMidnight: boolean;
  disabled: boolean;
  readOnly: boolean;
  hidden: HiddenInput[];
  messages: TimeInputState["messages"];
};

export type TimeRangeInputController = {
  getState(): TimeRangeInputState;
  subscribe(listener: (state: TimeRangeInputState) => void): () => void;
  setOptions(options: Partial<TimeRangeInputOptions>): void;
  getStart(): TimeInputController;
  getEnd(): TimeInputController;
  commit(): void;
  clear(): void;
  reset(): void;
  getRootAttributes(): Attributes;
  destroy(): void;
};

const same = (a: TimeValue, b: TimeValue): boolean =>
  a === b || (a !== null && b !== null && isSameTime(a, b));
const sameRange = (a: TimeRangeValue, b: TimeRangeValue): boolean =>
  a === b ||
  (a !== null && b !== null && same(a.start, b.start) && same(a.end, b.end));

const iso = (
  time: PlainTime | null | undefined,
  seconds: boolean,
): string | null =>
  time
    ? `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}${seconds ? `:${String(time.second).padStart(2, "0")}` : ""}`
    : null;

export function createTimeRangeInputController(
  initial: TimeRangeInputOptions = {},
): TimeRangeInputController {
  let options = initial;
  const id = options.id ?? createId("chrono-time-range-input");
  const control = createControllable<TimeRangeValue>({
    value: options.value,
    defaultValue: options.defaultValue ?? null,
    onChange: (value) => options.onValueChange?.(value),
    equals: sameRange,
  });
  let lastCommitted: TimeRangeValue = control.get();

  const childOptions = (): TimeInputOptions => {
    const {
      value: _v,
      defaultValue: _d,
      onValueChange: _c,
      onValueCommit: _m,
      name: _n,
      startName: _s,
      endName: _e,
      allowOvernight: _o,
      minDuration: _a,
      maxDuration: _b,
      ...shared
    } = options;
    return shared;
  };
  const combine = (start: TimeValue, end: TimeValue): TimeRangeValue =>
    start === null && end === null ? null : { start, end };

  const setSide = (side: "start" | "end", value: TimeValue): void => {
    const current = control.get();
    control.set(
      combine(
        side === "start" ? value : (current?.start ?? null),
        side === "end" ? value : (current?.end ?? null),
      ),
    );
    propagate();
    refresh();
  };
  const startController = createTimeInputController({
    ...childOptions(),
    id: `${id}-start`,
    value: control.get()?.start ?? null,
    defaultValue: undefined,
    onValueChange: (value) => setSide("start", value),
  });
  const endController = createTimeInputController({
    ...childOptions(),
    id: `${id}-end`,
    value: control.get()?.end ?? null,
    defaultValue: undefined,
    onValueChange: (value) => setSide("end", value),
  });
  function propagate(): void {
    const value = control.get();
    startController.setOptions({ value: value?.start ?? null });
    endController.setOptions({ value: value?.end ?? null });
  }

  let state: TimeRangeInputState;
  const listeners = new Set<(state: TimeRangeInputState) => void>();

  const limits = (): TimeRangeLimits => ({
    allowOvernight: options.allowOvernight,
    minDuration: options.minDuration,
    maxDuration: options.maxDuration,
  });

  const compute = (): TimeRangeInputState => {
    const start = startController.getState();
    const end = endController.getState();
    let validity: TimeRangeValidity;
    let duration: number | null = null;
    let crossesMidnight = false;
    if (start.validity === "empty" && end.validity === "empty")
      validity = "empty";
    else if (start.validity !== "valid" && start.validity !== "empty")
      validity = start.validity;
    else if (end.validity !== "valid" && end.validity !== "empty")
      validity = end.validity;
    else if (start.validity === "empty" || end.validity === "empty")
      validity = "incomplete";
    else {
      const check = checkTimeRangeValue(
        start.value as PlainTime,
        end.value as PlainTime,
        limits(),
      );
      if (check.valid) {
        validity = "valid";
        duration = check.duration;
        crossesMidnight = check.crossesMidnight;
      } else {
        validity = check.reason === "start-invalid" ? "disabled" : check.reason;
      }
    }
    const value = control.get();
    const seconds = start.granularity === "second";
    const name = options.name;
    return {
      id,
      value,
      validity,
      start,
      end,
      duration,
      crossesMidnight,
      disabled: start.disabled,
      readOnly: start.readOnly,
      hidden: getHiddenInputs([
        [
          options.startName ?? (name ? `${name}-start` : undefined),
          iso(value?.start, seconds),
        ],
        [
          options.endName ?? (name ? `${name}-end` : undefined),
          iso(value?.end, seconds),
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
  startController.subscribe(refresh);
  endController.subscribe(refresh);

  const controller: TimeRangeInputController = {
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
      startController.setOptions({
        ...shared,
        value: control.get()?.start ?? null,
      });
      endController.setOptions({
        ...shared,
        value: control.get()?.end ?? null,
      });
      refresh();
    },
    getStart: () => startController,
    getEnd: () => endController,
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
      startController.clear();
      endController.clear();
      lastCommitted = null;
    },
    reset() {
      const value = options.defaultValue ?? null;
      control.set(value);
      propagate();
      startController.reset();
      endController.reset();
      lastCommitted = value;
      refresh();
    },
    getRootAttributes: () => ({
      role: "group",
      "data-chrono-time-range-input": true,
      "data-mode": state.start.mode,
      "data-disabled": state.disabled,
      "data-readonly": state.readOnly,
      "data-invalid": isTimeInvalid(state.validity),
      "aria-disabled": state.disabled ? "true" : undefined,
      dir: state.start.direction,
    }),
    destroy() {
      listeners.clear();
      startController.destroy();
      endController.destroy();
    },
  };
  return controller;
}
