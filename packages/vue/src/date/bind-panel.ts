import type {
  PanelCell,
  PanelController,
  PanelDay,
  PanelState,
} from "@zealakit/chrono-core/date";
import {
  type WeekdayHeader,
  focusDateCell,
  plainDate,
  toIsoString,
} from "@zealakit/chrono-core/foundation";
import {
  type MaybeRefOrGetter,
  nextTick,
  onMounted,
  onScopeDispose,
  ref,
  shallowRef,
  toValue,
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

export function bindPanel(
  // biome-ignore lint/suspicious/noExplicitAny: the panels share one binding
  controller: PanelController<any, any>,
  options: MaybeRefOrGetter<object> | null,
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
  if (options !== null) {
    watch(
      () => ({ ...toValue(options) }),
      ({ id: _id, ...next }: Props) => controller.setOptions(next),
    );
  }
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
    if (options !== null) controller.destroy();
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
