"use client";

import type {
  AllDayRowSegment,
  CalendarDay,
  CalendarOptions,
  CalendarState,
} from "@zealakit/chrono-core/calendar";
import type { TimeSlot, WeekdayHeader } from "@zealakit/chrono-core/foundation";
import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  forwardRef,
  useEffect,
  useRef,
} from "react";
import { mergeProps } from "../shared/merge-props.js";
import { Part } from "../shared/part.js";
import { composeRefs } from "../shared/slot.js";
import { CalendarContext, useCalendarContext } from "./context.js";
import { splitCalendarProps } from "./options.js";
import { type EventSegment, useCalendar } from "./use-calendar.js";

type PartProps<T extends keyof React.JSX.IntrinsicElements> = Omit<
  ComponentPropsWithoutRef<T>,
  "children"
> & { asChild?: boolean };

const withChrono = (consumer: object, chrono: object) =>
  mergeProps(
    consumer as Record<string, unknown>,
    chrono as Record<string, unknown>,
  );

export type CalendarProps = Omit<PartProps<"div">, keyof CalendarOptions> &
  CalendarOptions & { children?: ReactNode };

/** Creates the calendar. Props are the calendar options plus any `div` props. */
export const Calendar = forwardRef<HTMLElement, CalendarProps>(
  function Calendar({ children, asChild, ...props }, ref) {
    const [options, rest] = splitCalendarProps(props);
    const calendar = useCalendar({
      ...options,
      id: (props as { id?: string }).id,
    });
    const { ref: rootRef, ...rootProps } = calendar.getRootProps();
    const { id: _id, ...elementProps } = rest;
    return (
      <CalendarContext.Provider value={calendar}>
        <Part
          as="div"
          asChild={asChild}
          ref={composeRefs(ref, rootRef)}
          {...withChrono(elementProps, rootProps)}
        >
          {children}
        </Part>
      </CalendarContext.Provider>
    );
  },
);

export type CalendarTitleProps = PartProps<"h2"> & {
  children?: ReactNode | ((title: CalendarState["title"]) => ReactNode);
};

export const CalendarTitle = forwardRef<HTMLHeadingElement, CalendarTitleProps>(
  function CalendarTitle({ children, asChild, ...rest }, ref) {
    const calendar = useCalendarContext("CalendarTitle");
    const { title } = calendar.state;
    return (
      <Part
        as="h2"
        asChild={asChild}
        ref={ref as never}
        {...withChrono(rest, calendar.getTitleProps())}
      >
        {typeof children === "function"
          ? children(title)
          : (children ?? title.text)}
      </Part>
    );
  },
);

type ButtonProps = PartProps<"button"> & { children?: ReactNode };

type NavButtonProps = ButtonProps & {
  kind: "prev" | "next" | "today";
  part: string;
};

const NavButton = forwardRef<HTMLButtonElement, NavButtonProps>(
  function NavButton({ kind, part, children, asChild, ...rest }, ref) {
    const calendar = useCalendarContext(part);
    const props = calendar.getNavProps(kind);
    return (
      <Part
        as="button"
        asChild={asChild}
        ref={ref as never}
        {...withChrono(rest, props)}
      >
        {children ?? props["aria-label"]}
      </Part>
    );
  },
);

export const CalendarPrevButton = forwardRef<HTMLButtonElement, ButtonProps>(
  function CalendarPrevButton(props, ref) {
    return (
      <NavButton ref={ref} kind="prev" part="CalendarPrevButton" {...props} />
    );
  },
);

export const CalendarNextButton = forwardRef<HTMLButtonElement, ButtonProps>(
  function CalendarNextButton(props, ref) {
    return (
      <NavButton ref={ref} kind="next" part="CalendarNextButton" {...props} />
    );
  },
);

export const CalendarTodayButton = forwardRef<HTMLButtonElement, ButtonProps>(
  function CalendarTodayButton(props, ref) {
    return (
      <NavButton ref={ref} kind="today" part="CalendarTodayButton" {...props} />
    );
  },
);

export type CalendarViewButtonProps = ButtonProps & { view: string };

export const CalendarViewButton = forwardRef<
  HTMLButtonElement,
  CalendarViewButtonProps
>(function CalendarViewButton({ view, children, asChild, ...rest }, ref) {
  const calendar = useCalendarContext("CalendarViewButton");
  return (
    <Part
      as="button"
      asChild={asChild}
      ref={ref as never}
      {...withChrono(rest, calendar.getViewButtonProps(view))}
    >
      {children ?? view}
    </Part>
  );
});

export type CalendarWeekdayHeaderProps = PartProps<"th"> & {
  header: WeekdayHeader;
  children?: ReactNode;
};

export const CalendarWeekdayHeader = forwardRef<
  HTMLTableCellElement,
  CalendarWeekdayHeaderProps
>(function CalendarWeekdayHeader({ header, children, asChild, ...rest }, ref) {
  const calendar = useCalendarContext("CalendarWeekdayHeader");
  return (
    <Part
      as="th"
      asChild={asChild}
      ref={ref as never}
      {...withChrono(rest, calendar.getColumnHeaderProps(header))}
    >
      {children ?? header.short}
    </Part>
  );
});

export type CalendarWeekNumberProps = PartProps<"th"> & {
  weekNumber: number;
  children?: ReactNode;
};

export const CalendarWeekNumber = forwardRef<
  HTMLTableCellElement,
  CalendarWeekNumberProps
>(function CalendarWeekNumber({ weekNumber, children, asChild, ...rest }, ref) {
  const calendar = useCalendarContext("CalendarWeekNumber");
  return (
    <Part
      as="th"
      asChild={asChild}
      ref={ref as never}
      {...withChrono(rest, calendar.getWeekNumberProps(weekNumber))}
    >
      {children ?? weekNumber}
    </Part>
  );
});

export type CalendarCellProps = PartProps<"td"> & {
  day: CalendarDay;
  children?: ReactNode;
};

export const CalendarCell = forwardRef<HTMLTableCellElement, CalendarCellProps>(
  function CalendarCell({ day, children, asChild, ...rest }, ref) {
    const calendar = useCalendarContext("CalendarCell");
    return (
      <Part
        as="td"
        asChild={asChild}
        ref={ref as never}
        {...withChrono(rest, calendar.getCellProps(day))}
      >
        {children ?? day.date.day}
      </Part>
    );
  },
);

export type CalendarMonthGridProps = PartProps<"table"> & {
  /** Index of the month grid in a multi-month view. */
  month?: number;
  /** Content of each day cell. Defaults to the day number. */
  children?: (day: CalendarDay) => ReactNode;
};

/** A month grid: weekday headers, optional week numbers and one cell per visible day. */
export const CalendarMonthGrid = forwardRef<
  HTMLTableElement,
  CalendarMonthGridProps
>(function CalendarMonthGrid({ month = 0, children, asChild, ...rest }, ref) {
  const calendar = useCalendarContext("CalendarMonthGrid");
  const tableRef = useRef<HTMLElement | null>(null);
  const { layout } = calendar.state;

  // `eventLimit: "auto"` measures the first cell and first event, then sets the
  // limit (plan 05 §3.1). Browser-only, after mount; SSR / no ResizeObserver
  // keeps the controller's fallback (3).
  useEffect(() => {
    if (month !== 0) return;
    const controller = calendar.controller;
    if (controller.getEventLimit() !== "auto") return;
    const table = tableRef.current;
    if (!table || typeof ResizeObserver === "undefined") return;
    const measure = (): void => {
      const cell = table.querySelector('td[role="gridcell"]');
      const event = table.querySelector("[data-chrono-event]");
      if (!cell || !event) return;
      const cellHeight = (cell as HTMLElement).clientHeight;
      const eventHeight = (event as HTMLElement).offsetHeight;
      if (cellHeight > 0 && eventHeight > 0) {
        controller.setEventLimit(
          Math.max(1, Math.floor(cellHeight / eventHeight)),
        );
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(table);
    return () => observer.disconnect();
  }, [calendar, month]);

  if (layout.kind !== "month") return null;
  const model = layout.months[month];
  if (!model) return null;
  return (
    <Part
      as="table"
      asChild={asChild}
      ref={composeRefs(ref, tableRef)}
      {...withChrono(rest, calendar.getGridProps(month))}
    >
      <thead>
        <tr>
          {layout.weekNumbers ? <td /> : null}
          {layout.weekdays.map((header) => (
            <CalendarWeekdayHeader key={header.dayOfWeek} header={header} />
          ))}
        </tr>
      </thead>
      <tbody>
        {model.weeks.map((week) => (
          <tr key={week.days[0]?.key}>
            {layout.weekNumbers ? (
              <CalendarWeekNumber weekNumber={week.weekNumber} />
            ) : null}
            {week.days
              .filter((day) => !day.hidden)
              .map((day) => (
                <CalendarCell key={day.key} day={day}>
                  {children ? children(day) : undefined}
                </CalendarCell>
              ))}
          </tr>
        ))}
      </tbody>
    </Part>
  );
});

export type CalendarTimeGridProps = PartProps<"div"> & {
  children?: (grid: { days: CalendarDay[]; slots: TimeSlot[] }) => ReactNode;
};

export const CalendarTimeGrid = forwardRef<
  HTMLDivElement,
  CalendarTimeGridProps
>(function CalendarTimeGrid({ children, asChild, ...rest }, ref) {
  const calendar = useCalendarContext("CalendarTimeGrid");
  const { layout } = calendar.state;
  if (layout.kind !== "time-grid") return null;
  return (
    <Part
      as="div"
      asChild={asChild}
      ref={ref as never}
      {...withChrono(rest, calendar.getTimeGridProps())}
    >
      {children?.({ days: layout.days, slots: layout.slots })}
    </Part>
  );
});

export type CalendarTimeGridColumnHeaderProps = PartProps<"div"> & {
  day: CalendarDay;
  children?: ReactNode;
};

export const CalendarTimeGridColumnHeader = forwardRef<
  HTMLDivElement,
  CalendarTimeGridColumnHeaderProps
>(function CalendarTimeGridColumnHeader(
  { day, children, asChild, ...rest },
  ref,
) {
  const calendar = useCalendarContext("CalendarTimeGridColumnHeader");
  return (
    <Part
      as="div"
      asChild={asChild}
      ref={ref as never}
      {...withChrono(rest, calendar.getColumnHeaderProps(day))}
    >
      {children ?? day.date.day}
    </Part>
  );
});

export type CalendarTimeGridSlotProps = Omit<PartProps<"div">, "slot"> & {
  slot: TimeSlot;
  day: CalendarDay;
  children?: ReactNode;
};

export const CalendarTimeGridSlot = forwardRef<
  HTMLDivElement,
  CalendarTimeGridSlotProps
>(function CalendarTimeGridSlot(
  { slot, day, children, asChild, ...rest },
  ref,
) {
  const calendar = useCalendarContext("CalendarTimeGridSlot");
  return (
    <Part
      as="div"
      asChild={asChild}
      ref={ref as never}
      {...withChrono(rest, calendar.getSlotProps(slot, day))}
    >
      {children}
    </Part>
  );
});

export type CalendarAgendaProps = PartProps<"ul"> & {
  children?: (days: CalendarDay[]) => ReactNode;
};

export const CalendarAgenda = forwardRef<HTMLUListElement, CalendarAgendaProps>(
  function CalendarAgenda({ children, asChild, ...rest }, ref) {
    const calendar = useCalendarContext("CalendarAgenda");
    const { layout } = calendar.state;
    if (layout.kind !== "list") return null;
    return (
      <Part
        as="ul"
        asChild={asChild}
        ref={ref as never}
        {...withChrono(rest, calendar.getAgendaProps())}
      >
        {children?.(layout.days)}
      </Part>
    );
  },
);

export type CalendarAgendaDayProps = PartProps<"li"> & {
  day: CalendarDay;
  children?: ReactNode;
};

export const CalendarAgendaDay = forwardRef<
  HTMLLIElement,
  CalendarAgendaDayProps
>(function CalendarAgendaDay({ day, children, asChild, ...rest }, ref) {
  const calendar = useCalendarContext("CalendarAgendaDay");
  return (
    <Part
      as="li"
      asChild={asChild}
      ref={ref as never}
      {...withChrono(rest, calendar.getAgendaDayProps(day))}
    >
      {children ?? day.key}
    </Part>
  );
});

// ---- Events (plan 05 §3.1) ----

export type CalendarEventsProps = PartProps<"div"> & {
  /** The cell whose events this list renders. */
  day: CalendarDay;
  /** Receives the segments hosted by `day`. */
  children?: (segments: EventSegment[]) => ReactNode;
};

/** The event list of one cell (E11). Render `CalendarEvent`s from the segments. */
export const CalendarEvents = forwardRef<HTMLElement, CalendarEventsProps>(
  function CalendarEvents({ day, children, asChild, ...rest }, ref) {
    const calendar = useCalendarContext("CalendarEvents");
    const segments = calendar.controller.getCellEventSegments(day);
    const interacting =
      calendar.state.focus.mode === "interaction" &&
      calendar.state.focus.cellKey === day.key;
    return (
      <Part
        as="div"
        asChild={asChild}
        ref={ref as never}
        {...withChrono(rest, {
          role: "group",
          "aria-label": calendar.state.messages.events,
          "data-interacting": interacting ? "" : undefined,
        })}
      >
        {children ? children(segments) : null}
      </Part>
    );
  },
);

export type CalendarEventProps = PartProps<"div"> & {
  segment: EventSegment;
  children?: ReactNode;
};

/** One event segment. `children` render the app's content (generic over `TEvent`). */
export const CalendarEvent = forwardRef<HTMLElement, CalendarEventProps>(
  function CalendarEvent({ segment, children, asChild, ...rest }, ref) {
    const calendar = useCalendarContext("CalendarEvent");
    return (
      <Part
        as="div"
        asChild={asChild}
        ref={ref as never}
        {...withChrono(rest, calendar.getEventProps(segment))}
      >
        {children}
      </Part>
    );
  },
);

export type CalendarEventResizeHandleProps = PartProps<"div"> & {
  segment: EventSegment;
  edge: "start" | "end";
  children?: ReactNode;
};

/** A resize handle inside an event. Style and position it in your CSS; Chrono writes state only. */
export const CalendarEventResizeHandle = forwardRef<
  HTMLElement,
  CalendarEventResizeHandleProps
>(function CalendarEventResizeHandle(
  { segment, edge, children, asChild, ...rest },
  ref,
) {
  const calendar = useCalendarContext("CalendarEventResizeHandle");
  return (
    <Part
      as="div"
      asChild={asChild}
      ref={ref as never}
      {...withChrono(rest, calendar.getResizeHandleProps(segment, edge))}
    >
      {children}
    </Part>
  );
});

export type CalendarEventDragPreviewProps = PartProps<"div"> & {
  /** The cell that hosts the preview pieces. */
  day: CalendarDay;
  /** Render the all-day row pieces of `day` instead of the grid or month pieces. */
  allDay?: boolean;
  /** Content of each preview piece. */
  children?: ReactNode | ((piece: EventSegment) => ReactNode);
};

/** The drag preview of one cell: one element per preview piece, `aria-hidden`. */
export const CalendarEventDragPreview = forwardRef<
  HTMLElement,
  CalendarEventDragPreviewProps
>(function CalendarEventDragPreview(
  { day, allDay, children, asChild, ...rest },
  ref,
) {
  const calendar = useCalendarContext("CalendarEventDragPreview");
  const pieces = calendar.getDragPreviewPieces(day, allDay);
  return (
    <>
      {pieces.map((piece) => (
        <Part
          key={piece.key}
          as="div"
          asChild={asChild}
          ref={ref as never}
          {...withChrono(rest, calendar.getDragPreviewProps(piece))}
        >
          {typeof children === "function" ? children(piece) : children}
        </Part>
      ))}
    </>
  );
});

export type CalendarMoreButtonProps = PartProps<"button"> & {
  day: CalendarDay;
  children?: ReactNode;
};

/** The "+N more" control of an overflowing day (E22). Renders nothing without overflow. */
export const CalendarMoreButton = forwardRef<
  HTMLButtonElement,
  CalendarMoreButtonProps
>(function CalendarMoreButton({ day, children, asChild, ...rest }, ref) {
  const calendar = useCalendarContext("CalendarMoreButton");
  const overflow = calendar.state.more.find((m) => m.dayKey === day.key);
  if (!overflow) {
    return null;
  }
  return (
    <Part
      as="button"
      asChild={asChild}
      ref={ref as never}
      {...withChrono(rest, calendar.getMoreProps(day))}
    >
      {children ?? `+${overflow.count} more`}
    </Part>
  );
});

export type CalendarAllDayRowProps = PartProps<"div"> & {
  children?: (row: {
    days: CalendarDay[];
    segments: AllDayRowSegment[];
  }) => ReactNode;
};

/** The time-grid all-day row. Renders nothing outside time-grid views. */
export const CalendarAllDayRow = forwardRef<
  HTMLElement,
  CalendarAllDayRowProps
>(function CalendarAllDayRow({ children, asChild, ...rest }, ref) {
  const calendar = useCalendarContext("CalendarAllDayRow");
  const { layout, allDayRow } = calendar.state;
  if (layout.kind !== "time-grid") {
    return null;
  }
  return (
    <Part
      as="div"
      asChild={asChild}
      ref={ref as never}
      {...withChrono(rest, {})}
    >
      {children?.({ days: layout.days, segments: allDayRow })}
    </Part>
  );
});

/** The now-indicator line. Renders nothing when the indicator is out of view. */
export const CalendarNowIndicator = forwardRef<HTMLElement, PartProps<"div">>(
  function CalendarNowIndicator({ asChild, ...rest }, ref) {
    const calendar = useCalendarContext("CalendarNowIndicator");
    if (!calendar.state.nowIndicator) {
      return null;
    }
    return (
      <Part
        as="div"
        asChild={asChild}
        ref={ref as never}
        {...withChrono(rest, calendar.getNowIndicatorProps())}
      />
    );
  },
);

export type CalendarSelectionPreviewProps = PartProps<"div"> & {
  day: CalendarDay;
};

/** A selection preview piece for one covered day (rendered while selecting). */
export const CalendarSelectionPreview = forwardRef<
  HTMLElement,
  CalendarSelectionPreviewProps
>(function CalendarSelectionPreview({ day, asChild, ...rest }, ref) {
  const calendar = useCalendarContext("CalendarSelectionPreview");
  const props = calendar.getSelectionPreviewProps(day);
  if (Object.keys(props).length === 0) {
    return null;
  }
  return (
    <Part
      as="div"
      asChild={asChild}
      ref={ref as never}
      {...withChrono(rest, props)}
    />
  );
});
