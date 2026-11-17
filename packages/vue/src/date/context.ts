import { type InjectionKey, inject } from "vue";
import type {
  DateFieldComposable,
  DateRangeInputComposable,
} from "./use-date-input.js";
import type { DatePanelComposable } from "./use-date-panel.js";

export const DatePanelKey: InjectionKey<DatePanelComposable> =
  Symbol("chrono-date-panel");
export const DateFieldKey: InjectionKey<DateFieldComposable> =
  Symbol("chrono-date-field");
export const DateRangeKey: InjectionKey<DateRangeInputComposable> = Symbol(
  "chrono-date-range-input",
);

/** Internal: parts read their panel from the nearest panel root (no global Provider). */
export function useDatePanelContext(part: string): DatePanelComposable {
  const value = inject(DatePanelKey, null);
  if (!value) {
    throw new Error(
      `[chrono-vue] <${part}> must be used inside <DatePanel>, <DateRangePanel> or <MultiDatePanel>.`,
    );
  }
  return value;
}

export function useDateFieldContext(part: string): DateFieldComposable {
  const value = inject(DateFieldKey, null);
  if (!value) {
    throw new Error(
      `[chrono-vue] <${part}> must be used inside <DateInput> or a <DateRangeInput> field.`,
    );
  }
  return value;
}

export function useDateRangeContext(part: string): DateRangeInputComposable {
  const value = inject(DateRangeKey, null);
  if (!value) {
    throw new Error(
      `[chrono-vue] <${part}> must be used inside <DateRangeInput>.`,
    );
  }
  return value;
}
