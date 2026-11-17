"use client";

import type {
  CalendarDay,
  CalendarOptions,
  CalendarState,
} from "@zealakit/chrono-core/calendar";
import type { TimeSlot, WeekdayHeader } from "@zealakit/chrono-core/foundation";
import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  forwardRef,
} from "react";
import { mergeProps } from "../shared/merge-props.js";
import { Part } from "../shared/part.js";
import { composeRefs } from "../shared/slot.js";
import { CalendarContext, useCalendarContext } from "./context.js";
import { splitCalendarProps } from "./options.js";
import { useCalendar } from "./use-calendar.js";

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
  const { layout } = calendar.state;
  if (layout.kind !== "month") return null;
  const model = layout.months[month];
  if (!model) return null;
  return (
    <Part
      as="table"
      asChild={asChild}
      ref={ref as never}
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
