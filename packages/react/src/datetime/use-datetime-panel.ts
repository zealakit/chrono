"use client";

import {
  type DateTimePanelOptions,
  type DateTimeRangePanelOptions,
  createDateTimePanelController,
  createDateTimeRangePanelController,
} from "@zealakit/chrono-core/datetime";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useBoundPanel as useBoundDatePanel } from "../date/bind-panel.js";
import { useBoundPanel as useBoundTimePanel } from "../time/bind-panel.js";
import { type ChronoProps, toReactProps } from "../shared/to-react-props.js";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Headless date-time panel for React: one controller composing a Date panel and a
 * Time panel (plan 08 X6). `date` and `time` are the bound prop getters the
 * `/date` and `/time` parts read inside the containers.
 */
export function useDateTimePanel(options: DateTimePanelOptions = {}) {
  const generatedId = useId();
  const [controller] = useState(() =>
    createDateTimePanelController({
      ...options,
      id: options.id ?? generatedId,
    }),
  );
  useIsomorphicLayoutEffect(() => {
    const { id: _id, ...next } = options;
    controller.setOptions(next);
  });
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState,
  );
  // The composite controller pushes the options of the inner controllers itself.
  const date = useBoundDatePanel(controller.getDate(), null);
  const time = useBoundTimePanel(controller.getTime(), null);
  return useMemo(
    () => ({
      state,
      controller,
      date,
      time,
      actions: { clear: controller.clear, commit: controller.commit },
      getRootProps: (): ChronoProps =>
        toReactProps(controller.getRootAttributes()),
    }),
    [controller, state, date, time],
  );
}

export type DateTimePanelPropGetters = ReturnType<typeof useDateTimePanel>;

/** Headless date-time range panel: a date range panel and two time panels (plan 08 X9). */
export function useDateTimeRangePanel(options: DateTimeRangePanelOptions = {}) {
  const generatedId = useId();
  const [controller] = useState(() =>
    createDateTimeRangePanelController({
      ...options,
      id: options.id ?? generatedId,
    }),
  );
  useIsomorphicLayoutEffect(() => {
    const { id: _id, ...next } = options;
    controller.setOptions(next);
  });
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState,
  );
  const date = useBoundDatePanel(controller.getDate(), null);
  const startTime = useBoundTimePanel(controller.getStartTime(), null);
  const endTime = useBoundTimePanel(controller.getEndTime(), null);
  return useMemo(
    () => ({
      state,
      controller,
      date,
      startTime,
      endTime,
      actions: { clear: controller.clear, commit: controller.commit },
      getRootProps: (): ChronoProps =>
        toReactProps(controller.getRootAttributes()),
    }),
    [controller, state, date, startTime, endTime],
  );
}

export type DateTimeRangePanelPropGetters = ReturnType<
  typeof useDateTimeRangePanel
>;
