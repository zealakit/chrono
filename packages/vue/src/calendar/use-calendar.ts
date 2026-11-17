import {
  type CalendarDay,
  type CalendarOptions,
  createCalendarController,
} from "@zealakit/chrono-core/calendar";
import {
  type PlainDate,
  type TimeSlot,
  type WeekdayHeader,
  focusDateCell,
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

/**
 * Headless calendar for Vue. Pass options (or a ref / getter of them); the
 * returned `state` is a `shallowRef` that follows the controller. No Provider.
 */
export function useCalendar(options: MaybeRefOrGetter<CalendarOptions> = {}) {
  const initial = toValue(options);
  const id = initial.id ?? (getCurrentInstance() ? useId() : undefined);
  const controller = createCalendarController({
    ...initial,
    id,
    lazyStart: true,
  });
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
  onMounted(() => controller.start());
  onScopeDispose(() => {
    stop();
    controller.destroy();
  });

  const dayProps = (attributes: Props, day: CalendarDay): Props => ({
    ...attributes,
    onClick: () => controller.activateDate(day.date, "pointer"),
    onKeydown: (event: KeyboardEvent) => {
      // The key press starts from the cell it happened on, however that cell got focus.
      controller.focusDate(day.date);
      if (controller.handleKeyDown(event.key, modifiersOf(event))) {
        event.preventDefault();
        keyboardMove = true;
      }
    },
  });

  return {
    state,
    controller,
    rootRef,
    actions: {
      prev: controller.prev,
      next: controller.next,
      today: controller.today,
      goTo: controller.goTo,
      setView: controller.setView,
      setRange: controller.setRange,
      focusDate: (date: PlainDate) => controller.focusDate(date),
    },
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
      (kind: "prev" | "next" | "today"): Props => ({
        ...toVueProps(controller.getNavAttributes(kind)),
        onClick: controller[kind],
      }),
    ),
    getViewButtonProps: tracked(
      (view: string): Props => ({
        ...toVueProps(controller.getViewButtonAttributes(view)),
        onClick: () => controller.setView(view),
      }),
    ),
    getGridProps: tracked(
      (monthIndex: number = 0): Props =>
        toVueProps(controller.getGridAttributes(monthIndex)),
    ),
    getColumnHeaderProps: tracked(
      (day: CalendarDay | WeekdayHeader): Props =>
        "date" in day
          ? dayProps(toVueProps(controller.getColumnHeaderAttributes(day)), day)
          : toVueProps(controller.getColumnHeaderAttributes(day)),
    ),
    getCellProps: tracked(
      (day: CalendarDay): Props =>
        dayProps(toVueProps(controller.getCellAttributes(day)), day),
    ),
    getWeekNumberProps: tracked(
      (weekNumber: number): Props =>
        toVueProps(controller.getWeekNumberAttributes(weekNumber)),
    ),
    getTimeGridProps: tracked(
      (): Props => toVueProps(controller.getTimeGridAttributes()),
    ),
    getSlotProps: tracked(
      (slot: TimeSlot, day: CalendarDay): Props =>
        toVueProps(controller.getSlotAttributes(slot, day)),
    ),
    getAgendaProps: tracked(
      (): Props => toVueProps(controller.getAgendaAttributes()),
    ),
    getAgendaDayProps: tracked(
      (day: CalendarDay): Props =>
        dayProps(toVueProps(controller.getAgendaDayAttributes(day)), day),
    ),
  };
}

export type CalendarComposable = ReturnType<typeof useCalendar>;
