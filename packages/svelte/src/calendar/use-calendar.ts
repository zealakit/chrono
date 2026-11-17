import {
  type CalendarDay,
  type CalendarOptions,
  type CalendarState,
  createCalendarController,
} from "@zealakit/chrono-core/calendar";
import {
  type PlainDate,
  type TimeSlot,
  type WeekdayHeader,
  focusDateCell,
} from "@zealakit/chrono-core/foundation";
import { tick } from "svelte";
import { type Props, modifiersOf, toProps } from "../shared/props.js";

/** A Svelte store: `$state` in a component subscribes to it. */
export type Readable<T> = { subscribe(run: (value: T) => void): () => void };

/**
 * Headless calendar for Svelte. `state` is a store; the getters return
 * attribute records with event handlers, to spread onto your own elements.
 * Call `controller.setOptions(...)` (or use `<Calendar>`) to push new options.
 */
export function useCalendar(options: CalendarOptions = {}) {
  const controller = createCalendarController({ ...options, lazyStart: true });
  const state: Readable<CalendarState> = {
    subscribe(run) {
      run(controller.getState());
      return controller.subscribe(run);
    },
  };
  let root: HTMLElement | null = null;
  let keyboardMove = false;

  controller.subscribe(async (next) => {
    if (!keyboardMove) return;
    await tick();
    if (root) focusDateCell(root, next.focusedDate);
    keyboardMove = false;
  });

  const dayProps = (attributes: Props, day: CalendarDay): Props => ({
    ...attributes,
    onclick: () => controller.activateDate(day.date, "pointer"),
    onkeydown: (event: KeyboardEvent) => {
      // The key press starts from the cell it happened on, however that cell got focus.
      controller.focusDate(day.date);
      // Set before handling: the subscriber above runs synchronously with the state change.
      keyboardMove = true;
      if (controller.handleKeyDown(event.key, modifiersOf(event)))
        event.preventDefault();
      else keyboardMove = false;
    },
  });

  return {
    state,
    controller,
    /** Tell the calendar which element holds the grid, so keyboard moves can move DOM focus. */
    setRoot(element: HTMLElement | null) {
      root = element;
    },
    actions: {
      prev: controller.prev,
      next: controller.next,
      today: controller.today,
      goTo: controller.goTo,
      setView: controller.setView,
      setRange: controller.setRange,
      focusDate: (date: PlainDate) => controller.focusDate(date),
    },
    getRootProps: (): Props => ({
      ...toProps(controller.getRootAttributes()),
      onkeyup: () => {
        keyboardMove = false;
      },
    }),
    getTitleProps: (): Props => toProps(controller.getTitleAttributes()),
    getNavProps: (kind: "prev" | "next" | "today"): Props => ({
      ...toProps(controller.getNavAttributes(kind)),
      onclick: controller[kind],
    }),
    getViewButtonProps: (view: string): Props => ({
      ...toProps(controller.getViewButtonAttributes(view)),
      onclick: () => controller.setView(view),
    }),
    getGridProps: (monthIndex = 0): Props =>
      toProps(controller.getGridAttributes(monthIndex)),
    getColumnHeaderProps: (day: CalendarDay | WeekdayHeader): Props =>
      "date" in day
        ? dayProps(toProps(controller.getColumnHeaderAttributes(day)), day)
        : toProps(controller.getColumnHeaderAttributes(day)),
    getCellProps: (day: CalendarDay): Props =>
      dayProps(toProps(controller.getCellAttributes(day)), day),
    getWeekNumberProps: (weekNumber: number): Props =>
      toProps(controller.getWeekNumberAttributes(weekNumber)),
    getTimeGridProps: (): Props => toProps(controller.getTimeGridAttributes()),
    getSlotProps: (slot: TimeSlot, day: CalendarDay): Props =>
      toProps(controller.getSlotAttributes(slot, day)),
    getAgendaProps: (): Props => toProps(controller.getAgendaAttributes()),
    getAgendaDayProps: (day: CalendarDay): Props =>
      dayProps(toProps(controller.getAgendaDayAttributes(day)), day),
  };
}

export type CalendarApi = ReturnType<typeof useCalendar>;
