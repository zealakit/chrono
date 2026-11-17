"use client";

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
  type KeyboardEvent,
  type RefObject,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { modifiersOf } from "../shared/modifiers.js";
import { type ChronoProps, toReactProps } from "../shared/to-react-props.js";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Props of the elements `useCalendar` describes. Spread them onto your own elements. */
export type CalendarPropGetters = ReturnType<typeof useCalendar>;

/**
 * Headless calendar for React. Returns the state and prop getters that add
 * event handlers to the core attribute records. No Provider is needed.
 */
export function useCalendar(options: CalendarOptions = {}) {
  const generatedId = useId();
  const [controller] = useState(() =>
    createCalendarController({
      ...options,
      id: options.id ?? generatedId,
      lazyStart: true,
    }),
  );
  const rootRef = useRef<HTMLElement | null>(null);
  const keyboardMove = useRef(false);

  useIsomorphicLayoutEffect(() => {
    const { id: _id, ...next } = options;
    controller.setOptions(next);
  });
  useEffect(() => {
    controller.start();
  }, [controller]);

  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState,
  );

  // After a keyboard move, DOM focus follows the roving tabindex (only when it was inside the grid).
  useIsomorphicLayoutEffect(() => {
    if (!keyboardMove.current || !rootRef.current) return;
    focusDateCell(rootRef.current, state.focusedDate);
    keyboardMove.current = false;
  }, [state]);

  return useMemo(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (controller.handleKeyDown(event.key, modifiersOf(event))) {
        event.preventDefault();
        keyboardMove.current = true;
      }
    };
    const dayProps = (
      attributes: ChronoProps,
      day: CalendarDay,
    ): ChronoProps => ({
      ...attributes,
      onClick: () => controller.activateDate(day.date, "pointer"),
      onFocus: () => controller.focusDate(day.date),
      onKeyDown,
    });
    return {
      state,
      controller,
      actions: {
        prev: controller.prev,
        next: controller.next,
        today: controller.today,
        goTo: controller.goTo,
        setView: controller.setView,
        setRange: controller.setRange,
        focusDate: (date: PlainDate) => controller.focusDate(date),
      },
      getRootProps: () => ({
        ...toReactProps(controller.getRootAttributes()),
        ref: rootRef as RefObject<HTMLElement>,
        onKeyUp: () => {
          keyboardMove.current = false;
        },
      }),
      getTitleProps: () => toReactProps(controller.getTitleAttributes()),
      getNavProps: (kind: "prev" | "next" | "today"): ChronoProps => ({
        ...toReactProps(controller.getNavAttributes(kind)),
        onClick: controller[kind],
      }),
      getViewButtonProps: (view: string): ChronoProps => ({
        ...toReactProps(controller.getViewButtonAttributes(view)),
        onClick: () => controller.setView(view),
      }),
      getGridProps: (monthIndex = 0) =>
        toReactProps(controller.getGridAttributes(monthIndex)),
      getColumnHeaderProps: (day: CalendarDay | WeekdayHeader): ChronoProps =>
        "date" in day
          ? dayProps(
              toReactProps(controller.getColumnHeaderAttributes(day)),
              day,
            )
          : toReactProps(controller.getColumnHeaderAttributes(day)),
      getCellProps: (day: CalendarDay) =>
        dayProps(toReactProps(controller.getCellAttributes(day)), day),
      getWeekNumberProps: (weekNumber: number) =>
        toReactProps(controller.getWeekNumberAttributes(weekNumber)),
      getTimeGridProps: () => toReactProps(controller.getTimeGridAttributes()),
      getSlotProps: (slot: TimeSlot, day: CalendarDay) =>
        toReactProps(controller.getSlotAttributes(slot, day)),
      getAgendaProps: () => toReactProps(controller.getAgendaAttributes()),
      getAgendaDayProps: (day: CalendarDay) =>
        dayProps(toReactProps(controller.getAgendaDayAttributes(day)), day),
    };
  }, [controller, state]);
}
