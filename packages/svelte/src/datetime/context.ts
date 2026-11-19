import { getContext, setContext } from "svelte";
import type {
  DateTimeFieldApi,
  DateTimeRangeInputApi,
} from "./use-datetime-input.js";
import type {
  DateTimePanelApi,
  DateTimeRangePanelApi,
} from "./use-datetime-panel.js";

const panelKey = Symbol("chrono-datetime-panel");
const fieldKey = Symbol("chrono-datetime-field");
const rangeKey = Symbol("chrono-datetime-range-input");

export const setDateTimePanelContext = (
  api: DateTimePanelApi | DateTimeRangePanelApi,
): void => {
  setContext(panelKey, api);
};
export const setDateTimeFieldContext = (api: DateTimeFieldApi): void => {
  setContext(fieldKey, api);
};
export const setDateTimeRangeContext = (api: DateTimeRangeInputApi): void => {
  setContext(rangeKey, api);
};

export function getDateTimePanelContext(
  part: string,
): DateTimePanelApi & DateTimeRangePanelApi {
  const value = getContext<unknown>(panelKey);
  if (!value) {
    throw new Error(
      `[chrono-svelte] <${part}> must be used inside <DateTimePanel> or <DateTimeRangePanel>.`,
    );
  }
  return value as DateTimePanelApi & DateTimeRangePanelApi;
}

export function getDateTimeFieldContext(part: string): DateTimeFieldApi {
  const value = getContext<DateTimeFieldApi | undefined>(fieldKey);
  if (!value) {
    throw new Error(
      `[chrono-svelte] <${part}> must be used inside <DateTimeInput> or a <DateTimeRangeInput> field.`,
    );
  }
  return value;
}

export function getDateTimeRangeContext(part: string): DateTimeRangeInputApi {
  const value = getContext<DateTimeRangeInputApi | undefined>(rangeKey);
  if (!value) {
    throw new Error(
      `[chrono-svelte] <${part}> must be used inside <DateTimeRangeInput>.`,
    );
  }
  return value;
}
