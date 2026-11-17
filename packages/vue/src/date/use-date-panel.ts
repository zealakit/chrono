import {
  type DatePanelOptions,
  type DateRangePanelOptions,
  type MultiDatePanelOptions,
  type PanelCell,
  type PanelController,
  type PanelDay,
  type PanelState,
  createDatePanelController,
  createDateRangePanelController,
  createMultiDatePanelController,
} from "@zealakit/chrono-core/date";
import {
  type WeekdayHeader,
  focusDateCell,
  plainDate,
  toIsoString,
} from "@zealakit/chrono-core/foundation";
import {
  type MaybeRefOrGetter,
  getCurrentInstance,
  nextTick,
  onMounted,
  onScopeDispose,
  ref,
  shallowRef,
  toValue,
  useId,
  watch,
} from "vue";
import { modifiersOf, toVueProps } from "../shared/to-vue-props.js";

type Props = Record<string, unknown>;

/** The `data-chrono-key` of the cell that holds the tab stop at the current level. */
function focusKeyOf(state: PanelState): string {
  const { focusedDate, level } = state;
  return level === "day"
    ? toIsoString(focusedDate)
    : level === "month"
      ? `${focusedDate.year}-${String(focusedDate.month).padStart(2, "0")}`
      : String(focusedDate.year);
}

// biome-ignore lint/suspicious/noExplicitAny: the three panels share one binding
function bindPanel(
  controller: PanelController<any, any>,
  options: MaybeRefOrGetter<object>,
) {
  const state = shallowRef(controller.getState());
  const rootRef = ref<HTMLElement | null>(null);
  /** Reading `state` inside a getter makes the part that calls it re-render when the state changes. */
  const tracked =
    <A extends unknown[], R>(fn: (...args: A) => R) =>
    (...args: A): R => {
      void state.value;
      return fn(...args);
    };
  let keyboardMove = false;

  const stop = controller.subscribe((next) => {
    state.value = next;
  });
  watch(
    () => ({ ...toValue(options) }),
    ({ id: _id, ...next }: Props) => controller.setOptions(next),
  );
  watch(state, async (next) => {
    if (!keyboardMove) return;
    await nextTick();
    if (rootRef.value) focusDateCell(rootRef.value, focusKeyOf(next));
    keyboardMove = false;
  });
  // autoFocus is opt-in and runs after mount, never during setup or SSR (A8).
  onMounted(() => {
    const first = controller.getState();
    if (first.autoFocus && rootRef.value) {
      focusDateCell(rootRef.value, focusKeyOf(first));
    }
  });
  onScopeDispose(() => {
    stop();
    controller.destroy();
  });

  const keyHandler = (focus: () => void) => (event: KeyboardEvent) => {
    focus();
    if (controller.handleKeyDown(event.key, modifiersOf(event))) {
      event.preventDefault();
      // Escape is stopped only when it cancelled something (A18).
      if (event.key === "Escape") event.stopPropagation();
      keyboardMove = true;
    }
  };

  return {
    state,
    controller,
    rootRef,
    actions: {
      prev: controller.prev,
      next: controller.next,
      today: controller.today,
      clear: controller.clear,
      commit: controller.commit,
      setLevel: controller.setLevel,
    },
    getRootProps: tracked(
      (): Props => ({
        ...toVueProps(controller.getRootAttributes()),
        onKeyup: () => {
          keyboardMove = false;
        },
        onMouseleave: () => {
          if (state.value.draft) controller.setPreview(null);
        },
      }),
    ),
    getTitleProps: tracked(
      (): Props => toVueProps(controller.getTitleAttributes()),
    ),
    getLevelButtonProps: tracked(
      (): Props => ({
        ...toVueProps(controller.getLevelButtonAttributes()),
        onClick: () => {
          const current = controller.getState();
          if (current.canGoUp) {
            controller.setLevel(current.level === "day" ? "month" : "year");
          }
        },
      }),
    ),
    getNavProps: tracked(
      (kind: "prev" | "next"): Props => ({
        ...toVueProps(controller.getNavAttributes(kind)),
        onClick: controller[kind],
      }),
    ),
    getTodayButtonProps: tracked(
      (): Props => ({
        ...toVueProps(controller.getTodayButtonAttributes()),
        onClick: controller.today,
      }),
    ),
    getGridProps: tracked(
      (): Props => toVueProps(controller.getGridAttributes()),
    ),
    getColumnHeaderProps: tracked(
      (header: WeekdayHeader): Props =>
        toVueProps(controller.getColumnHeaderAttributes(header)),
    ),
    getWeekNumberProps: tracked(
      (weekNumber: number): Props =>
        toVueProps(controller.getWeekNumberAttributes(weekNumber)),
    ),
    getCellProps: tracked((day: PanelDay): Props => {
      const attributes = toVueProps(controller.getCellAttributes(day));
      if (day.hidden) return attributes;
      return {
        ...attributes,
        onClick: (event: MouseEvent) => {
          if (state.value.kind === "multi" && event.shiftKey) {
            controller.extendTo(day.date);
          } else {
            controller.pick(day.date, "pointer");
          }
        },
        onMouseenter: () => {
          if (state.value.draft) controller.setPreview(day.date);
        },
        onKeydown: keyHandler(() => controller.focusDate(day.date)),
      };
    }),
    getLevelCellProps: tracked((cell: PanelCell): Props => {
      const date = plainDate(cell.year, cell.month, 1);
      return {
        ...toVueProps(controller.getLevelCellAttributes(cell)),
        onClick: () => controller.pick(date, "pointer"),
        onKeydown: keyHandler(() => controller.focusDate(date)),
      };
    }),
  };
}

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
