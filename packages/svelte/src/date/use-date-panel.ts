import {
  type DatePanelOptions,
  type DateRangePanelOptions,
  type MultiDatePanelOptions,
  createDatePanelController,
  createDateRangePanelController,
  createMultiDatePanelController,
} from "@zealakit/chrono-core/date";

import { bindPanel } from "./bind-panel.js";

export type DatePanelApi = ReturnType<typeof bindPanel>;

/** Headless single-date panel for Svelte: a store plus prop getters. */
export const useDatePanel = (options: DatePanelOptions = {}): DatePanelApi =>
  bindPanel(createDatePanelController(options));

export const useDateRangePanel = (
  options: DateRangePanelOptions = {},
): DatePanelApi => bindPanel(createDateRangePanelController(options));

export const useMultiDatePanel = (
  options: MultiDatePanelOptions = {},
): DatePanelApi => bindPanel(createMultiDatePanelController(options));
