import {
  type TimePanelOptions,
  type TimeRangePanelOptions,
  createTimePanelController,
  createTimeRangePanelController,
} from "@zealakit/chrono-core/time";

import { bindPanel } from "./bind-panel.js";

export type TimePanelApi = ReturnType<typeof bindPanel>;

/** Headless single-time panel for Svelte: a store plus prop getters. */
export const useTimePanel = (options: TimePanelOptions = {}): TimePanelApi =>
  bindPanel(createTimePanelController(options));

export const useTimeRangePanel = (
  options: TimeRangePanelOptions = {},
): TimePanelApi => bindPanel(createTimeRangePanelController(options));
