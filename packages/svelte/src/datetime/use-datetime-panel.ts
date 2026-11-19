import {
  type DateTimePanelOptions,
  type DateTimePanelState,
  type DateTimeRangePanelOptions,
  type DateTimeRangePanelState,
  createDateTimePanelController,
  createDateTimeRangePanelController,
} from "@zealakit/chrono-core/datetime";
import { bindPanel as bindDatePanel } from "../date/bind-panel.js";
import { type Props, toProps } from "../shared/props.js";
import type { Readable } from "../shared/readable.js";
import { bindPanel as bindTimePanel } from "../time/bind-panel.js";

/** Headless date-time panel for Svelte: one controller composing a Date and a Time panel. */
export function useDateTimePanel(options: DateTimePanelOptions = {}) {
  const controller = createDateTimePanelController(options);
  const state: Readable<DateTimePanelState> = {
    subscribe(run) {
      run(controller.getState());
      return controller.subscribe(run);
    },
  };
  return {
    state,
    controller,
    date: bindDatePanel(controller.getDate()),
    time: bindTimePanel(controller.getTime()),
    actions: { clear: controller.clear, commit: controller.commit },
    getRootProps: (): Props => toProps(controller.getRootAttributes()),
  };
}

export type DateTimePanelApi = ReturnType<typeof useDateTimePanel>;

/** Headless date-time range panel: a date range panel and two time panels. */
export function useDateTimeRangePanel(options: DateTimeRangePanelOptions = {}) {
  const controller = createDateTimeRangePanelController(options);
  const state: Readable<DateTimeRangePanelState> = {
    subscribe(run) {
      run(controller.getState());
      return controller.subscribe(run);
    },
  };
  return {
    state,
    controller,
    date: bindDatePanel(controller.getDate()),
    startTime: bindTimePanel(controller.getStartTime()),
    endTime: bindTimePanel(controller.getEndTime()),
    actions: { clear: controller.clear, commit: controller.commit },
    getRootProps: (): Props => toProps(controller.getRootAttributes()),
  };
}

export type DateTimeRangePanelApi = ReturnType<typeof useDateTimeRangePanel>;
