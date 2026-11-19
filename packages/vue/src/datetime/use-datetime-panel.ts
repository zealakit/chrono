import {
  type DateTimePanelOptions,
  type DateTimeRangePanelOptions,
  createDateTimePanelController,
  createDateTimeRangePanelController,
} from "@zealakit/chrono-core/datetime";
import {
  type MaybeRefOrGetter,
  getCurrentInstance,
  onScopeDispose,
  shallowRef,
  toValue,
  useId,
  watch,
} from "vue";
import { bindPanel as bindDatePanel } from "../date/bind-panel.js";
import { bindPanel as bindTimePanel } from "../time/bind-panel.js";
import { toVueProps } from "../shared/to-vue-props.js";

type Props = Record<string, unknown>;
const idOf = (options: { id?: string }): string | undefined =>
  options.id ?? (getCurrentInstance() ? useId() : undefined);

/** Headless date-time panel for Vue: one controller composing a Date and a Time panel. */
export function useDateTimePanel(
  options: MaybeRefOrGetter<DateTimePanelOptions> = {},
) {
  const initial = toValue(options);
  const controller = createDateTimePanelController({
    ...initial,
    id: idOf(initial),
  });
  const state = shallowRef(controller.getState());
  const stop = controller.subscribe((next) => {
    state.value = next;
  });
  watch(
    () => ({ ...toValue(options) }),
    ({ id: _id, ...next }) => controller.setOptions(next),
  );
  onScopeDispose(() => {
    stop();
    controller.destroy();
  });
  // The composite controller pushes the options of the inner controllers itself.
  const date = bindDatePanel(controller.getDate(), null);
  const time = bindTimePanel(controller.getTime(), null);
  return {
    state,
    controller,
    date,
    time,
    actions: { clear: controller.clear, commit: controller.commit },
    getRootProps: (): Props => {
      void state.value;
      return toVueProps(controller.getRootAttributes());
    },
  };
}

export type DateTimePanelComposable = ReturnType<typeof useDateTimePanel>;

/** Headless date-time range panel: a date range panel and two time panels. */
export function useDateTimeRangePanel(
  options: MaybeRefOrGetter<DateTimeRangePanelOptions> = {},
) {
  const initial = toValue(options);
  const controller = createDateTimeRangePanelController({
    ...initial,
    id: idOf(initial),
  });
  const state = shallowRef(controller.getState());
  const stop = controller.subscribe((next) => {
    state.value = next;
  });
  watch(
    () => ({ ...toValue(options) }),
    ({ id: _id, ...next }) => controller.setOptions(next),
  );
  onScopeDispose(() => {
    stop();
    controller.destroy();
  });
  const date = bindDatePanel(controller.getDate(), null);
  const startTime = bindTimePanel(controller.getStartTime(), null);
  const endTime = bindTimePanel(controller.getEndTime(), null);
  return {
    state,
    controller,
    date,
    startTime,
    endTime,
    actions: { clear: controller.clear, commit: controller.commit },
    getRootProps: (): Props => {
      void state.value;
      return toVueProps(controller.getRootAttributes());
    },
  };
}

export type DateTimeRangePanelComposable = ReturnType<
  typeof useDateTimeRangePanel
>;
