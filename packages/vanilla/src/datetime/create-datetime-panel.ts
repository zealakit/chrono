import {
  type DateTimePanelController,
  type DateTimePanelOptions,
  type DateTimePanelState,
  type DateTimeRangePanelController,
  type DateTimeRangePanelOptions,
  type DateTimeRangePanelState,
  createDateTimePanelController,
  createDateTimeRangePanelController,
} from "@zealakit/chrono-core/datetime";
import { bindPanel as bindDatePanel } from "../date/bind-panel.js";
import { bindPanel as bindTimePanel } from "../time/bind-panel.js";

const host = (root: HTMLElement, selector: string): HTMLElement =>
  root.querySelector<HTMLElement>(selector) ?? root;

export type VanillaDateTimePanel = {
  readonly controller: DateTimePanelController;
  getState(): DateTimePanelState;
  subscribe(listener: (state: DateTimePanelState) => void): () => void;
  setOptions(options: Partial<DateTimePanelOptions>): void;
  syncFocus(): void;
  destroy(): void;
};

/**
 * Controller-only date-time panel: a Date panel and a Time panel on one controller.
 * Put the date markup in `[data-chrono-datetime-date]` and the time markup in
 * `[data-chrono-datetime-time]` inside `root` (each defaults to `root`).
 */
export function createDateTimePanel(
  root: HTMLElement,
  options: DateTimePanelOptions = {},
): VanillaDateTimePanel {
  const controller = createDateTimePanelController(options);
  const date = bindDatePanel<unknown, never>(
    host(root, "[data-chrono-datetime-date]"),
    controller.getDate() as never,
    false,
  );
  const time = bindTimePanel<never>(
    host(root, "[data-chrono-datetime-time]"),
    controller.getTime() as never,
    false,
  );
  return {
    controller,
    getState: controller.getState,
    subscribe: controller.subscribe,
    setOptions: controller.setOptions,
    syncFocus() {
      date.syncFocus();
      time.syncFocus();
    },
    destroy() {
      date.destroy();
      time.destroy();
      controller.destroy();
    },
  };
}

export type VanillaDateTimeRangePanel = {
  readonly controller: DateTimeRangePanelController;
  getState(): DateTimeRangePanelState;
  subscribe(listener: (state: DateTimeRangePanelState) => void): () => void;
  setOptions(options: Partial<DateTimeRangePanelOptions>): void;
  syncFocus(): void;
  destroy(): void;
};

/**
 * Controller-only date-time range panel. Hosts: `[data-chrono-datetime-date]`,
 * `[data-chrono-datetime-start-time]` and `[data-chrono-datetime-end-time]`.
 */
export function createDateTimeRangePanel(
  root: HTMLElement,
  options: DateTimeRangePanelOptions = {},
): VanillaDateTimeRangePanel {
  const controller = createDateTimeRangePanelController(options);
  const date = bindDatePanel<unknown, never>(
    host(root, "[data-chrono-datetime-date]"),
    controller.getDate() as never,
    false,
  );
  const start = bindTimePanel<never>(
    host(root, "[data-chrono-datetime-start-time]"),
    controller.getStartTime() as never,
    false,
  );
  const end = bindTimePanel<never>(
    host(root, "[data-chrono-datetime-end-time]"),
    controller.getEndTime() as never,
    false,
  );
  return {
    controller,
    getState: controller.getState,
    subscribe: controller.subscribe,
    setOptions: controller.setOptions,
    syncFocus() {
      date.syncFocus();
      start.syncFocus();
      end.syncFocus();
    },
    destroy() {
      date.destroy();
      start.destroy();
      end.destroy();
      controller.destroy();
    },
  };
}
