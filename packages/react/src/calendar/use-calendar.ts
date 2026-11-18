"use client";

import {
  type CalendarDay,
  type CalendarEvents,
  type CalendarOptions,
  type ResourceColumn,
  type ResourceGroupHeader,
  type ResourcePieceLike,
  type TimelineHeaderCell,
  type TimelineRow,
  type TimelineSlot,
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

/** Props of the elements `useCalendar` describes. Spread them onto your own elements. */
export type CalendarPropGetters = ReturnType<typeof useCalendar>;

export type EventSegment = CalendarEvents[number];

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
    controller.mount(rootRef.current);
    return () => controller.unmount();
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
    const dayProps = (
      attributes: ChronoProps,
      day: CalendarDay,
    ): ChronoProps => ({
      ...attributes,
      onClick: () => controller.activateDate(day.date, "pointer"),
      onKeyDown: (event: KeyboardEvent) => {
        // The key press starts from the cell it happened on, however that cell got focus.
        controller.focusDate(day.date);
        if (controller.handleKeyDown(event.key, modifiersOf(event))) {
          event.preventDefault();
          keyboardMove.current = true;
        }
      },
    });

    const slotProps = (
      attributes: ChronoProps,
      day: CalendarDay,
    ): ChronoProps => ({
      ...attributes,
      onClick: () => controller.focusDate(day.date),
      onKeyDown: (event: KeyboardEvent) => {
        controller.focusDate(day.date);
        if (controller.handleKeyDown(event.key, modifiersOf(event))) {
          event.preventDefault();
          keyboardMove.current = true;
        }
      },
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
        selectEvent: (id: string | number | null) => controller.selectEvent(id),
        clearSelection: controller.clearSelection,
        toggleResource: controller.toggleResource,
        zoomIn: controller.zoomIn,
        zoomOut: controller.zoomOut,
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
          ? toReactProps(controller.getColumnHeaderAttributes(day))
          : toReactProps(controller.getColumnHeaderAttributes(day)),
      getCellProps: (day: CalendarDay) =>
        dayProps(toReactProps(controller.getCellAttributes(day)), day),
      getWeekNumberProps: (weekNumber: number) =>
        toReactProps(controller.getWeekNumberAttributes(weekNumber)),
      getTimeGridProps: () => toReactProps(controller.getTimeGridAttributes()),
      getSlotProps: (slot: TimeSlot, day: CalendarDay) =>
        slotProps(toReactProps(controller.getSlotAttributes(slot, day)), day),
      getAgendaProps: () => toReactProps(controller.getAgendaAttributes()),
      getAgendaDayProps: (day: CalendarDay) =>
        dayProps(toReactProps(controller.getAgendaDayAttributes(day)), day),
      getEventProps: (segment: EventSegment): ChronoProps => ({
        ...toReactProps(controller.getEventAttributes(segment)),
        onClick: (event: MouseEvent) => {
          event.stopPropagation();
          controller.selectEvent(segment.event.id);
        },
        onDoubleClick: (event: MouseEvent) => {
          event.stopPropagation();
          controller.activateEvent(segment.key, "pointer");
        },
        onKeyDown: (event: KeyboardEvent) => {
          if (controller.handleKeyDown(event.key, modifiersOf(event))) {
            event.preventDefault();
          }
        },
      }),
      getResizeHandleProps: (
        segment: EventSegment,
        edge: "start" | "end",
      ): ChronoProps =>
        toReactProps(controller.getResizeHandleAttributes(segment, edge)),
      getDragPreviewProps: (piece: EventSegment): ChronoProps =>
        toReactProps(controller.getDragPreviewAttributes(piece)),
      getDragPreviewPieces: (day: CalendarDay, allDay = false) =>
        controller.getCellDragPreviewSegments(day, allDay),
      getResourceHeaderProps: (column: ResourceColumn): ChronoProps =>
        toReactProps(controller.getResourceHeaderAttributes(column)),
      getResourceGroupHeaderProps: (group: ResourceGroupHeader): ChronoProps =>
        toReactProps(controller.getResourceGroupHeaderAttributes(group)),
      getTimelineProps: (): ChronoProps =>
        toReactProps(controller.getTimelineAttributes()),
      getTimelineHeaderCellProps: (cell: TimelineHeaderCell): ChronoProps =>
        toReactProps(controller.getTimelineHeaderCellAttributes(cell)),
      getTimelineRowProps: (row: TimelineRow): ChronoProps =>
        toReactProps(controller.getTimelineRowAttributes(row)),
      getTimelineRowHeaderProps: (row: TimelineRow): ChronoProps => ({
        ...toReactProps(controller.getTimelineRowHeaderAttributes(row)),
        onClick: row.group
          ? () => controller.toggleResource(row.id)
          : undefined,
      }),
      getTimelineCellProps: (
        row: TimelineRow,
        slot: TimelineSlot,
      ): ChronoProps =>
        toReactProps(controller.getTimelineCellAttributes(row, slot)),
      getResourcePieceProps: (
        piece: ResourcePieceLike<EventSegment["event"]>,
      ): ChronoProps => ({
        ...toReactProps(controller.getResourcePieceAttributes(piece)),
        onClick: (event: MouseEvent) => {
          event.stopPropagation();
          controller.selectEvent(piece.event.id);
        },
      }),
      getMoreProps: (day: CalendarDay): ChronoProps => ({
        ...toReactProps(controller.getMoreAttributes(day)),
        onClick: (event: MouseEvent) => {
          event.stopPropagation();
          controller.activateMore(day.key);
        },
      }),
      getAllDayCellProps: (day: CalendarDay): ChronoProps =>
        toReactProps(controller.getAllDayCellAttributes(day)),
      getNowIndicatorProps: (): ChronoProps =>
        toReactProps(controller.getNowIndicatorAttributes()),
      getSelectionPreviewProps: (day: CalendarDay): ChronoProps =>
        toReactProps(controller.getSelectionPreviewAttributes(day)),
    };
  }, [controller, state]);
}
