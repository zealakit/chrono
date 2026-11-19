import {
  type TimePanelOptions,
  type TimeRangePanelOptions,
  createTimePanelController,
  createTimeRangePanelController,
} from "@zealakit/chrono-core/time";
import { type MaybeRefOrGetter, getCurrentInstance, toValue, useId } from "vue";

import { bindPanel } from "./bind-panel.js";

const idOf = (options: { id?: string }): string | undefined =>
  options.id ?? (getCurrentInstance() ? useId() : undefined);

/** Headless single-time panel for Vue. Pass options (or a ref / getter of them). */
export function useTimePanel(options: MaybeRefOrGetter<TimePanelOptions> = {}) {
  const initial = toValue(options);
  return bindPanel(
    createTimePanelController({ ...initial, id: idOf(initial) }),
    options,
  );
}

export function useTimeRangePanel(
  options: MaybeRefOrGetter<TimeRangePanelOptions> = {},
) {
  const initial = toValue(options);
  return bindPanel(
    createTimeRangePanelController({ ...initial, id: idOf(initial) }),
    options,
  );
}

export type TimePanelComposable = ReturnType<typeof bindPanel>;
