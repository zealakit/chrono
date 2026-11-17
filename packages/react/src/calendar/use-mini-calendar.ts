"use client";

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
import { type ChronoProps, toReactProps } from "../shared/to-react-props.js";
import { modifiersOf } from "../shared/modifiers.js";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Headless Mini Calendar for React: its own month, optionally synced with a main calendar. */
export function useMiniCalendar(options: MiniCalendarOptions = {}) {
  const generatedId = useId();
  const [controller] = useState(() =>
    createMiniCalendarController({ ...options, id: options.id ?? generatedId }),
  );
  const rootRef = useRef<HTMLElement | null>(null);
  const keyboardMove = useRef(false);

  useIsomorphicLayoutEffect(() => {
    const { id: _id, ...next } = options;
    controller.setOptions(next);
  });
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState,
  );

  useIsomorphicLayoutEffect(() => {
    if (!keyboardMove.current || !rootRef.current) return;
    focusDateCell(rootRef.current, state.focusedDate);
    keyboardMove.current = false;
  }, [state]);

  return useMemo(
    () => ({
      state,
      controller,
      actions: { prev: controller.prev, next: controller.next },
      getRootProps: () => ({
        ...toReactProps(controller.getRootAttributes()),
        ref: rootRef as RefObject<HTMLElement>,
        onKeyUp: () => {
          keyboardMove.current = false;
        },
      }),
      getTitleProps: () => toReactProps(controller.getTitleAttributes()),
      getNavProps: (kind: "prev" | "next"): ChronoProps => ({
        ...toReactProps(controller.getNavAttributes(kind)),
        onClick: controller[kind],
      }),
      getGridProps: () => toReactProps(controller.getGridAttributes()),
      getColumnHeaderProps: (header: WeekdayHeader) =>
        toReactProps(controller.getColumnHeaderAttributes(header)),
      getCellProps: (day: CalendarDay): ChronoProps => ({
        ...toReactProps(controller.getCellAttributes(day)),
        onClick: () => controller.activateDate(day.date, "pointer"),
        onFocus: () => controller.focusDate(day.date),
        onKeyDown: (event: KeyboardEvent) => {
          if (controller.handleKeyDown(event.key, modifiersOf(event))) {
            event.preventDefault();
            keyboardMove.current = true;
          }
        },
      }),
      getWeekNumberProps: (weekNumber: number) =>
        toReactProps(controller.getWeekNumberAttributes(weekNumber)),
    }),
    [controller, state],
  );
}
