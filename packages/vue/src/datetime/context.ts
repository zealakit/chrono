import { type InjectionKey, inject } from "vue";
import type {
  DateTimeFieldComposable,
  DateTimeRangeInputComposable,
} from "./use-datetime-input.js";
import type {
  DateTimePanelComposable,
  DateTimeRangePanelComposable,
} from "./use-datetime-panel.js";

export const DateTimePanelKey: InjectionKey<
  DateTimePanelComposable | DateTimeRangePanelComposable
> = Symbol("chrono-datetime-panel");
export const DateTimeFieldKey: InjectionKey<DateTimeFieldComposable> = Symbol(
  "chrono-datetime-field",
);
export const DateTimeRangeKey: InjectionKey<DateTimeRangeInputComposable> =
  Symbol("chrono-datetime-range-input");

export function useDateTimePanelContext(
  part: string,
): DateTimePanelComposable & DateTimeRangePanelComposable {
  const value = inject(DateTimePanelKey, null);
  if (!value) {
    throw new Error(
      `[chrono-vue] <${part}> must be used inside <DateTimePanel> or <DateTimeRangePanel>.`,
    );
  }
  return value as never;
}

export function useDateTimeFieldContext(part: string): DateTimeFieldComposable {
  const value = inject(DateTimeFieldKey, null);
  if (!value) {
    throw new Error(
      `[chrono-vue] <${part}> must be used inside <DateTimeInput> or a <DateTimeRangeInput> field.`,
    );
  }
  return value;
}

export function useDateTimeRangeContext(
  part: string,
): DateTimeRangeInputComposable {
  const value = inject(DateTimeRangeKey, null);
  if (!value) {
    throw new Error(
      `[chrono-vue] <${part}> must be used inside <DateTimeRangeInput>.`,
    );
  }
  return value;
}
