"use client";

import {
  type DatePanelOptions,
  type DateRangePanelOptions,
  type MultiDatePanelOptions,
  type PanelController,
  createDatePanelController,
  createDateRangePanelController,
  createMultiDatePanelController,
} from "@zealakit/chrono-core/date";
import { useId, useState } from "react";

import { useBoundPanel } from "./bind-panel.js";

export type DatePanelPropGetters = ReturnType<typeof useDatePanel>;

const make = <O extends { id?: string }>(
  create: (options: O) => PanelController<never, O>,
  options: O,
  generatedId: string,
) => create({ ...options, id: options.id ?? generatedId });

/** Headless single-date panel for React. No Provider is needed. */
export function useDatePanel(options: DatePanelOptions = {}) {
  const generatedId = useId();
  const [controller] = useState(() =>
    make(createDatePanelController as never, options, generatedId),
  );
  return useBoundPanel(
    controller as ReturnType<typeof createDatePanelController>,
    options as never,
  );
}

export function useDateRangePanel(options: DateRangePanelOptions = {}) {
  const generatedId = useId();
  const [controller] = useState(() =>
    make(createDateRangePanelController as never, options, generatedId),
  );
  return useBoundPanel(
    controller as ReturnType<typeof createDateRangePanelController>,
    options as never,
  );
}

export function useMultiDatePanel(options: MultiDatePanelOptions = {}) {
  const generatedId = useId();
  const [controller] = useState(() =>
    make(createMultiDatePanelController as never, options, generatedId),
  );
  return useBoundPanel(
    controller as ReturnType<typeof createMultiDatePanelController>,
    options as never,
  );
}
