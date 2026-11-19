"use client";

import {
  type TimePanelOptions,
  type TimePanelState,
  type TimeRangePanelOptions,
  createTimePanelController,
  createTimeRangePanelController,
} from "@zealakit/chrono-core/time";
import { useId, useState } from "react";

import { useBoundPanel } from "./bind-panel.js";

export type TimePanelPropGetters = ReturnType<typeof useBoundPanel>;

/** Headless single-time panel for React. No Provider is needed. */
export function useTimePanel(options: TimePanelOptions = {}) {
  const generatedId = useId();
  const [controller] = useState(() =>
    createTimePanelController({ ...options, id: options.id ?? generatedId }),
  );
  return useBoundPanel(controller, options);
}

export function useTimeRangePanel(options: TimeRangePanelOptions = {}) {
  const generatedId = useId();
  const [controller] = useState(() =>
    createTimeRangePanelController({
      ...options,
      id: options.id ?? generatedId,
    }),
  );
  return useBoundPanel(controller, options);
}

export type { TimePanelState };
