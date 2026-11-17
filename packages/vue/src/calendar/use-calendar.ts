import {
  type CalendarDay,
  type CalendarEvents,
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

export type EventSegment = CalendarEvents[number];

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
  onMounted(() => {
    controller.start();
    controller.mount(rootRef.value);
  });
  onScopeDispose(() => {
    stop();
    controller.unmount();
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

  const slotProps = (attributes: Props, day: CalendarDay): Props => ({
    ...attributes,
    onClick: () => controller.focusDate(day.date),
    onKeydown: (event: KeyboardEvent) => {
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
      selectEvent: (id: string | number | null) => controller.selectEvent(id),
      clearSelection: controller.clearSelection,
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
          ? toVueProps(controller.getColumnHeaderAttributes(day))
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
        slotProps(toVueProps(controller.getSlotAttributes(slot, day)), day),
    ),
    getAgendaProps: tracked(
      (): Props => toVueProps(controller.getAgendaAttributes()),
    ),
    getAgendaDayProps: tracked(
      (day: CalendarDay): Props =>
        dayProps(toVueProps(controller.getAgendaDayAttributes(day)), day),
    ),
    getEventProps: tracked(
      (segment: EventSegment): Props => ({
        ...toVueProps(controller.getEventAttributes(segment)),
        onClick: (event: MouseEvent) => {
          event.stopPropagation();
          controller.selectEvent(segment.event.id);
        },
        onDblclick: (event: MouseEvent) => {
          event.stopPropagation();
          controller.activateEvent(segment.key, "pointer");
        },
        onKeydown: (event: KeyboardEvent) => {
          if (controller.handleKeyDown(event.key, modifiersOf(event))) {
            event.preventDefault();
          }
        },
      }),
    ),
    getMoreProps: tracked(
      (day: CalendarDay): Props => ({
        ...toVueProps(controller.getMoreAttributes(day)),
        onClick: (event: MouseEvent) => {
          event.stopPropagation();
          controller.activateMore(day.key);
        },
      }),
    ),
    getAllDayCellProps: tracked(
      (day: CalendarDay): Props =>
        toVueProps(controller.getAllDayCellAttributes(day)),
    ),
    getNowIndicatorProps: tracked(
      (): Props => toVueProps(controller.getNowIndicatorAttributes()),
    ),
    getSelectionPreviewProps: tracked(
      (day: CalendarDay): Props =>
        toVueProps(controller.getSelectionPreviewAttributes(day)),
    ),
  };
}

export type CalendarComposable = ReturnType<typeof useCalendar>;
