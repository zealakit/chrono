import {
  type Attributes,
  type DateRange,
  type HiddenInput,
  compare,
  createControllable,
  createId,
  getHiddenInputs,
  isSameDay,
  toIsoString,
} from "../../foundation/index.js";
import {
  type PickConstraints,
  type RangeReason,
  checkPicked,
} from "../selection/range.js";
import type { DateRangeValue, DateValue } from "../types.js";
import {
  type DateInputController,
  type DateInputOptions,
  type DateInputState,
  createDateInputController,
} from "./date-input-controller.js";
import { type DateValidity, isInvalid } from "./validity.js";

export type DateRangeInputOptions = Omit<
  DateInputOptions,
  "value" | "defaultValue" | "onValueChange" | "onValueCommit" | "name"
> & {
  value?: DateRangeValue;
  defaultValue?: DateRangeValue;
  onValueChange?: (value: DateRangeValue) => void;
  onValueCommit?: (value: DateRange) => void;
  name?: string;
  startName?: string;
  endName?: string;
  minDays?: PickConstraints["minDays"];
  maxDays?: PickConstraints["maxDays"];
  allowUnavailableInside?: boolean;
  allowDisabledInside?: boolean;
};

export type RangeValidity = DateValidity | RangeReason;

export type DateRangeInputState = {
  id: string;
  value: DateRangeValue;
  validity: RangeValidity;
  start: DateInputState;
  end: DateInputState;
  disabled: boolean;
  readOnly: boolean;
  hidden: HiddenInput[];
  messages: DateInputState["messages"];
};

export type DateRangeInputController = {
  getState(): DateRangeInputState;
  subscribe(listener: (state: DateRangeInputState) => void): () => void;
  setOptions(options: Partial<DateRangeInputOptions>): void;
  getStart(): DateInputController;
  getEnd(): DateInputController;
  commit(): void;
  clear(): void;
  reset(): void;
  getRootAttributes(): Attributes;
  destroy(): void;
};

const sameNullable = (a: DateValue, b: DateValue): boolean =>
  a === b || (a !== null && b !== null && isSameDay(a, b));
const sameRange = (a: DateRangeValue, b: DateRangeValue): boolean =>
  a === b ||
  (a !== null &&
    b !== null &&
    sameNullable(a.start, b.start) &&
    sameNullable(a.end, b.end));

export function createDateRangeInputController(
  initial: DateRangeInputOptions = {},
): DateRangeInputController {
  let options = initial;
  const id = options.id ?? createId("chrono-date-range-input");

  const control = createControllable<DateRangeValue>({
    value: options.value,
    defaultValue: options.defaultValue ?? null,
    onChange: (value) => options.onValueChange?.(value),
    equals: sameRange,
  });
  let lastCommitted: DateRangeValue = control.get();

  const childOptions = (): DateInputOptions => {
    const {
      value: _v,
      defaultValue: _d,
      onValueChange: _c,
      onValueCommit: _m,
      name: _n,
      startName: _s,
      endName: _e,
      minDays: _a,
      maxDays: _b,
      allowUnavailableInside: _u,
      allowDisabledInside: _i,
      ...shared
    } = options;
    return shared;
  };

  const combine = (start: DateValue, end: DateValue): DateRangeValue =>
    start === null && end === null ? null : { start, end };

  const setSide = (side: "start" | "end", value: DateValue): void => {
    const current = control.get();
    const next = combine(
      side === "start" ? value : (current?.start ?? null),
      side === "end" ? value : (current?.end ?? null),
    );
    control.set(next);
    propagate();
    refresh();
  };

  const startController = createDateInputController({
    ...childOptions(),
    id: `${id}-start`,
    value: control.get()?.start ?? null,
    defaultValue: undefined,
    onValueChange: (value) => setSide("start", value),
  });
  const endController = createDateInputController({
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

  let state: DateRangeInputState;
  const listeners = new Set<(state: DateRangeInputState) => void>();

  const pickConstraints = (): PickConstraints => ({
    minDays: options.minDays,
    maxDays: options.maxDays,
    allowUnavailableInside: options.allowUnavailableInside,
    allowDisabledInside: options.allowDisabledInside,
    isDateDisabled: options.isDateDisabled,
    isDateUnavailable: options.isDateUnavailable,
  });

  const validityOf = (
    start: DateInputState,
    end: DateInputState,
  ): RangeValidity => {
    if (start.validity === "empty" && end.validity === "empty") return "empty";
    for (const side of [start, end]) {
      if (side.validity !== "valid" && side.validity !== "empty")
        return side.validity;
    }
    if (start.validity === "empty" || end.validity === "empty")
      return "incomplete";
    const a = start.value as NonNullable<DateValue>;
    const b = end.value as NonNullable<DateValue>;
    if (compare(b, a) < 0) return "end-before-start";
    const check = checkPicked({ start: a, end: b }, pickConstraints());
    return check.valid ? "valid" : check.reason;
  };

  const compute = (): DateRangeInputState => {
    const start = startController.getState();
    const end = endController.getState();
    const value = control.get();
    const name = options.name;
    return {
      id,
      value,
      validity: validityOf(start, end),
      start,
      end,
      disabled: start.disabled,
      readOnly: start.readOnly,
      hidden: getHiddenInputs([
        [
          options.startName ?? (name ? `${name}-start` : undefined),
          value?.start ? toIsoString(value.start) : null,
        ],
        [
          options.endName ?? (name ? `${name}-end` : undefined),
          value?.end ? toIsoString(value.end) : null,
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

  const controller: DateRangeInputController = {
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
      startController.settle();
      endController.settle();
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
      "data-chrono-date-range-input": true,
      "data-mode": state.start.mode,
      "data-disabled": state.disabled,
      "data-readonly": state.readOnly,
      "data-invalid": isInvalid(state.validity),
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
