import { getContext, setContext } from "svelte";
import type { DateFieldApi, DateRangeInputApi } from "./use-date-input.js";
import type { DatePanelApi } from "./use-date-panel.js";

const panelKey = Symbol("chrono-date-panel");
const fieldKey = Symbol("chrono-date-field");
const rangeKey = Symbol("chrono-date-range-input");

export const setDatePanelContext = (api: DatePanelApi): void => {
  setContext(panelKey, api);
};
export const setDateFieldContext = (api: DateFieldApi): void => {
  setContext(fieldKey, api);
};
export const setDateRangeContext = (api: DateRangeInputApi): void => {
  setContext(rangeKey, api);
};

/** Internal: parts read their panel from the nearest panel root (no global Provider). */
export function getDatePanelContext(part: string): DatePanelApi {
  const value = getContext<DatePanelApi | undefined>(panelKey);
  if (!value) {
    throw new Error(
      `[chrono-svelte] <${part}> must be used inside <DatePanel>, <DateRangePanel> or <MultiDatePanel>.`,
    );
  }
  return value;
}

export function getDateFieldContext(part: string): DateFieldApi {
  const value = getContext<DateFieldApi | undefined>(fieldKey);
  if (!value) {
    throw new Error(
      `[chrono-svelte] <${part}> must be used inside <DateInput> or a <DateRangeInput> field.`,
    );
  }
  return value;
}

export function getDateRangeContext(part: string): DateRangeInputApi {
  const value = getContext<DateRangeInputApi | undefined>(rangeKey);
  if (!value) {
    throw new Error(
      `[chrono-svelte] <${part}> must be used inside <DateRangeInput>.`,
    );
  }
  return value;
}
