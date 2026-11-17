import {
  type DatePanelOptions,
  type DateRangePanelOptions,
  type MultiDatePanelOptions,
  createDatePanelController,
  createDateRangePanelController,
  createMultiDatePanelController,
} from "@zealakit/chrono-core/date";
import { type MaybeRefOrGetter, getCurrentInstance, toValue, useId } from "vue";

import { bindPanel } from "./bind-panel.js";

const idOf = (options: { id?: string }): string | undefined =>
  options.id ?? (getCurrentInstance() ? useId() : undefined);

/** Headless single-date panel for Vue. Pass options (or a ref / getter of them). */
export function useDatePanel(options: MaybeRefOrGetter<DatePanelOptions> = {}) {
  const initial = toValue(options);
  return bindPanel(
    createDatePanelController({ ...initial, id: idOf(initial) }),
    options,
  );
}

export function useDateRangePanel(
  options: MaybeRefOrGetter<DateRangePanelOptions> = {},
) {
  const initial = toValue(options);
  return bindPanel(
    createDateRangePanelController({ ...initial, id: idOf(initial) }),
    options,
  );
}

export function useMultiDatePanel(
  options: MaybeRefOrGetter<MultiDatePanelOptions> = {},
) {
  const initial = toValue(options);
  return bindPanel(
    createMultiDatePanelController({ ...initial, id: idOf(initial) }),
    options,
  );
}

export type DatePanelComposable = ReturnType<typeof bindPanel>;
