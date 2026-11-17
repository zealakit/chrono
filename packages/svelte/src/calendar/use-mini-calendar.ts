import {
  type CalendarDay,
  type MiniCalendarOptions,
  type MiniCalendarState,
  createMiniCalendarController,
} from "@zealakit/chrono-core/calendar";
import {
  type WeekdayHeader,
  focusDateCell,
} from "@zealakit/chrono-core/foundation";
import { tick } from "svelte";
import { type Props, modifiersOf, toProps } from "../shared/props.js";
import type { Readable } from "./use-calendar.js";

/** Headless Mini Calendar for Svelte: its own month, optionally synced with a main calendar. */
export function useMiniCalendar(options: MiniCalendarOptions = {}) {
  const controller = createMiniCalendarController(options);
  const state: Readable<MiniCalendarState> = {
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

  return {
    state,
    controller,
    setRoot(element: HTMLElement | null) {
      root = element;
    },
    actions: { prev: controller.prev, next: controller.next },
    getRootProps: (): Props => ({
      ...toProps(controller.getRootAttributes()),
      onkeyup: () => {
        keyboardMove = false;
      },
    }),
    getTitleProps: (): Props => toProps(controller.getTitleAttributes()),
    getNavProps: (kind: "prev" | "next"): Props => ({
      ...toProps(controller.getNavAttributes(kind)),
      onclick: controller[kind],
    }),
    getGridProps: (): Props => toProps(controller.getGridAttributes()),
    getColumnHeaderProps: (header: WeekdayHeader): Props =>
      toProps(controller.getColumnHeaderAttributes(header)),
    getCellProps: (day: CalendarDay): Props => ({
      ...toProps(controller.getCellAttributes(day)),
      onclick: () => controller.activateDate(day.date, "pointer"),
      onkeydown: (event: KeyboardEvent) => {
        controller.focusDate(day.date);
        keyboardMove = true;
        if (controller.handleKeyDown(event.key, modifiersOf(event)))
          event.preventDefault();
        else keyboardMove = false;
      },
    }),
    getWeekNumberProps: (weekNumber: number): Props =>
      toProps(controller.getWeekNumberAttributes(weekNumber)),
  };
}

export type MiniCalendarApi = ReturnType<typeof useMiniCalendar>;
