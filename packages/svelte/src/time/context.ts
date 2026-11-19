import { getContext, setContext } from "svelte";
import type { TimeFieldApi, TimeRangeInputApi } from "./use-time-input.js";
import type { TimePanelApi } from "./use-time-panel.js";

const panelKey = Symbol("chrono-time-panel");
const fieldKey = Symbol("chrono-time-field");
const rangeKey = Symbol("chrono-time-range-input");

export const setTimePanelContext = (api: TimePanelApi): void => {
  setContext(panelKey, api);
};
export const setTimeFieldContext = (api: TimeFieldApi): void => {
  setContext(fieldKey, api);
};
export const setTimeRangeContext = (api: TimeRangeInputApi): void => {
  setContext(rangeKey, api);
};

/** Internal: parts read their panel from the nearest panel root (no global Provider). */
export function getTimePanelContext(part: string): TimePanelApi {
  const value = getContext<TimePanelApi | undefined>(panelKey);
  if (!value) {
    throw new Error(
      `[chrono-svelte] <${part}> must be used inside <TimePanel> or <TimeRangePanel>.`,
    );
  }
  return value;
}

export function getTimeFieldContext(part: string): TimeFieldApi {
  const value = getContext<TimeFieldApi | undefined>(fieldKey);
  if (!value) {
    throw new Error(
      `[chrono-svelte] <${part}> must be used inside <TimeInput> or a <TimeRangeInput> field.`,
    );
  }
  return value;
}

export function getTimeRangeContext(part: string): TimeRangeInputApi {
  const value = getContext<TimeRangeInputApi | undefined>(rangeKey);
  if (!value) {
    throw new Error(
      `[chrono-svelte] <${part}> must be used inside <TimeRangeInput>.`,
    );
  }
  return value;
}
