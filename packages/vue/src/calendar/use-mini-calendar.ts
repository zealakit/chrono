import {
  type CalendarDay,
  type MiniCalendarOptions,
  createMiniCalendarController,
} from "@zealakit/chrono-core/calendar";
import {
  type WeekdayHeader,
  focusDateCell,
} from "@zealakit/chrono-core/foundation";
import {
  type MaybeRefOrGetter,
  getCurrentInstance,
  nextTick,
  onScopeDispose,
  ref,
  shallowRef,
  toValue,
  useId,
  watch,
} from "vue";
import { modifiersOf, toVueProps } from "../shared/to-vue-props.js";

type Props = Record<string, unknown>;

/** Headless Mini Calendar for Vue: its own month, optionally synced with a main calendar. */
export function useMiniCalendar(
  options: MaybeRefOrGetter<MiniCalendarOptions> = {},
) {
  const initial = toValue(options);
  const id = initial.id ?? (getCurrentInstance() ? useId() : undefined);
  const controller = createMiniCalendarController({ ...initial, id });
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
    ({ id: _id, ...next }) => controller.setOptions(next),
  );
  watch(state, async (next) => {
    if (!keyboardMove) return;
    await nextTick();
    if (rootRef.value) focusDateCell(rootRef.value, next.focusedDate);
    keyboardMove = false;
  });
  onScopeDispose(() => {
    stop();
    controller.destroy();
  });

  return {
    state,
    controller,
    rootRef,
    actions: { prev: controller.prev, next: controller.next },
    getRootProps: tracked(
      (): Props => ({
        ...toVueProps(controller.getRootAttributes()),
        onKeyup: () => {
          keyboardMove = false;
        },
      }),
    ),
    getTitleProps: tracked(
      (): Props => toVueProps(controller.getTitleAttributes()),
    ),
    getNavProps: tracked(
      (kind: "prev" | "next"): Props => ({
        ...toVueProps(controller.getNavAttributes(kind)),
        onClick: controller[kind],
      }),
    ),
    getGridProps: tracked(
      (): Props => toVueProps(controller.getGridAttributes()),
    ),
    getColumnHeaderProps: tracked(
      (header: WeekdayHeader): Props =>
        toVueProps(controller.getColumnHeaderAttributes(header)),
    ),
    getCellProps: tracked(
      (day: CalendarDay): Props => ({
        ...toVueProps(controller.getCellAttributes(day)),
        onClick: () => controller.activateDate(day.date, "pointer"),
        onFocus: () => controller.focusDate(day.date),
        onKeydown: (event: KeyboardEvent) => {
          if (controller.handleKeyDown(event.key, modifiersOf(event))) {
            event.preventDefault();
            keyboardMove = true;
          }
        },
      }),
    ),
    getWeekNumberProps: tracked(
      (weekNumber: number): Props =>
        toVueProps(controller.getWeekNumberAttributes(weekNumber)),
    ),
  };
}

export type MiniCalendarComposable = ReturnType<typeof useMiniCalendar>;
