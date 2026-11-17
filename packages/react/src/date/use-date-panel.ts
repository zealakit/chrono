"use client";

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
  type KeyboardEvent,
  type MouseEvent,
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
function usePanel<C extends PanelController<any, any>>(
  controller: C,
  options: { id?: string } & Record<string, unknown>,
) {
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

  // autoFocus is opt-in and runs after mount, never during render or SSR (A8).
  useEffect(() => {
    const first = controller.getState();
    if (first.autoFocus && rootRef.current) {
      focusDateCell(rootRef.current, focusKeyOf(first));
    }
  }, [controller]);

  useIsomorphicLayoutEffect(() => {
    if (!keyboardMove.current || !rootRef.current) return;
    focusDateCell(rootRef.current, focusKeyOf(state));
    keyboardMove.current = false;
  }, [state]);

  return useMemo(() => {
    const keyHandler =
      (focus: () => void) =>
      (event: KeyboardEvent): void => {
        // The key press starts from the cell it happened on.
        focus();
        if (controller.handleKeyDown(event.key, modifiersOf(event))) {
          event.preventDefault();
          // Escape is stopped only when it cancelled something (A18).
          if (event.key === "Escape") event.stopPropagation();
          keyboardMove.current = true;
        }
      };
    return {
      state,
      controller,
      actions: {
        prev: controller.prev,
        next: controller.next,
        today: controller.today,
        clear: controller.clear,
        commit: controller.commit,
        setLevel: controller.setLevel,
      },
      getRootProps: (): ChronoProps & { ref: RefObject<HTMLElement> } => ({
        ...toReactProps(controller.getRootAttributes()),
        ref: rootRef as RefObject<HTMLElement>,
        onKeyUp: () => {
          keyboardMove.current = false;
        },
        onMouseLeave: () => {
          if (state.draft) controller.setPreview(null);
        },
      }),
      getTitleProps: () => toReactProps(controller.getTitleAttributes()),
      getLevelButtonProps: (): ChronoProps => ({
        ...toReactProps(controller.getLevelButtonAttributes()),
        onClick: () => {
          const next = state.level === "day" ? "month" : "year";
          if (state.canGoUp) controller.setLevel(next);
        },
      }),
      getNavProps: (kind: "prev" | "next"): ChronoProps => ({
        ...toReactProps(controller.getNavAttributes(kind)),
        onClick: controller[kind],
      }),
      getTodayButtonProps: (): ChronoProps => ({
        ...toReactProps(controller.getTodayButtonAttributes()),
        onClick: controller.today,
      }),
      getGridProps: () => toReactProps(controller.getGridAttributes()),
      getColumnHeaderProps: (header: WeekdayHeader) =>
        toReactProps(controller.getColumnHeaderAttributes(header)),
      getWeekNumberProps: (weekNumber: number) =>
        toReactProps(controller.getWeekNumberAttributes(weekNumber)),
      getCellProps: (day: PanelDay): ChronoProps => {
        const attributes = toReactProps(controller.getCellAttributes(day));
        if (day.hidden) return attributes;
        return {
          ...attributes,
          onClick: (event: MouseEvent) => {
            if (state.kind === "multi" && event.shiftKey) {
              controller.extendTo(day.date);
            } else {
              controller.pick(day.date, "pointer");
            }
          },
          onMouseEnter: () => {
            if (state.draft) controller.setPreview(day.date);
          },
          onKeyDown: keyHandler(() => controller.focusDate(day.date)),
        };
      },
      getLevelCellProps: (cell: PanelCell): ChronoProps => {
        const date = plainDate(cell.year, cell.month, 1);
        return {
          ...toReactProps(controller.getLevelCellAttributes(cell)),
          onClick: () => controller.pick(date, "pointer"),
          onKeyDown: keyHandler(() => controller.focusDate(date)),
        };
      },
    };
  }, [controller, state]);
}

export type DatePanelPropGetters = ReturnType<typeof useDatePanel>;

const make = <O extends { id?: string }>(
  create: (options: O) => PanelController<never, O>,
  options: O,
  generatedId: string,
) => create({ ...options, id: options.id ?? generatedId });

/** Headless single-date panel for React. No Provider is needed. */
export function useDatePanel(options: DatePanelOptions = {}) {
  const generatedId = useId();
  const [controller] = useState(() =>
    make(createDatePanelController as never, options, generatedId),
  );
  return usePanel(
    controller as ReturnType<typeof createDatePanelController>,
    options as never,
  );
}

export function useDateRangePanel(options: DateRangePanelOptions = {}) {
  const generatedId = useId();
  const [controller] = useState(() =>
    make(createDateRangePanelController as never, options, generatedId),
  );
  return usePanel(
    controller as ReturnType<typeof createDateRangePanelController>,
    options as never,
  );
}

export function useMultiDatePanel(options: MultiDatePanelOptions = {}) {
  const generatedId = useId();
  const [controller] = useState(() =>
    make(createMultiDatePanelController as never, options, generatedId),
  );
  return usePanel(
    controller as ReturnType<typeof createMultiDatePanelController>,
    options as never,
  );
}
