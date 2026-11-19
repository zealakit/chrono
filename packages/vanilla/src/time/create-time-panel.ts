import {
  type TimePanelOptions,
  type TimeRangePanelOptions,
  createTimePanelController,
  createTimeRangePanelController,
} from "@zealakit/chrono-core/time";
import { bindPanel } from "./bind-panel.js";

export type { VanillaTimePanel } from "./bind-panel.js";

/**
 * Controller-only time panels for plain DOM: render the markup from `state`
 * and stamp `controller.get*Attributes()` with `applyAttributes`. Listeners are
 * delegated on `root` for click, key and hover on `[role="option"]`.
 */
export const createTimePanel = (
  root: HTMLElement,
  options: TimePanelOptions = {},
) => bindPanel<TimePanelOptions>(root, createTimePanelController(options));

export const createTimeRangePanel = (
  root: HTMLElement,
  options: TimeRangePanelOptions = {},
) =>
  bindPanel<TimeRangePanelOptions>(
    root,
    createTimeRangePanelController(options),
  );
