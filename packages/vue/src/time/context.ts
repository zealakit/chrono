import { type InjectionKey, inject } from "vue";
import type {
  TimeFieldComposable,
  TimeRangeInputComposable,
} from "./use-time-input.js";
import type { TimePanelComposable } from "./use-time-panel.js";

export const TimePanelKey: InjectionKey<TimePanelComposable> =
  Symbol("chrono-time-panel");
export const TimeFieldKey: InjectionKey<TimeFieldComposable> =
  Symbol("chrono-time-field");
export const TimeRangeKey: InjectionKey<TimeRangeInputComposable> = Symbol(
  "chrono-time-range-input",
);

/** Internal: parts read their panel from the nearest panel root (no global Provider). */
export function useTimePanelContext(part: string): TimePanelComposable {
  const value = inject(TimePanelKey, null);
  if (!value) {
    throw new Error(
      `[chrono-vue] <${part}> must be used inside <TimePanel> or <TimeRangePanel>.`,
    );
  }
  return value;
}

export function useTimeFieldContext(part: string): TimeFieldComposable {
  const value = inject(TimeFieldKey, null);
  if (!value) {
    throw new Error(
      `[chrono-vue] <${part}> must be used inside <TimeInput> or a <TimeRangeInput> field.`,
    );
  }
  return value;
}

export function useTimeRangeContext(part: string): TimeRangeInputComposable {
  const value = inject(TimeRangeKey, null);
  if (!value) {
    throw new Error(
      `[chrono-vue] <${part}> must be used inside <TimeRangeInput>.`,
    );
  }
  return value;
}
