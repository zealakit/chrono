import {
  type DatePanelOptions,
  type DateRangePanelOptions,
  type MultiDatePanelOptions,
  createDatePanelController,
  createDateRangePanelController,
  createMultiDatePanelController,
} from "@zealakit/chrono-core/date";
import { bindPanel } from "./bind-panel.js";

export { cellDate } from "./bind-panel.js";
export type { VanillaPanel } from "./bind-panel.js";

/**
 * Controller-only panels for plain DOM (02 §6): you render the markup from
 * `state` and stamp `controller.get*Attributes()` with `applyAttributes`.
 * Listeners are delegated on `root`: click and keydown on `[data-chrono-key]`
 * cells, click on `[data-chrono-action="prev|next|today|level|clear"]`.
 * `autoFocus` focuses the active cell once.
 */
export function createDatePanel(
  root: HTMLElement,
  options: DatePanelOptions = {},
) {
  return bindPanel<unknown, DatePanelOptions>(
    root,
    createDatePanelController(options),
  );
}

export function createDateRangePanel(
  root: HTMLElement,
  options: DateRangePanelOptions = {},
) {
  return bindPanel<unknown, DateRangePanelOptions>(
    root,
    createDateRangePanelController(options),
  );
}

export function createMultiDatePanel(
  root: HTMLElement,
  options: MultiDatePanelOptions = {},
) {
  return bindPanel<unknown, MultiDatePanelOptions>(
    root,
    createMultiDatePanelController(options),
  );
}
