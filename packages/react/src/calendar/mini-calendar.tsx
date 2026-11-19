"use client";

import type {
  CalendarDay,
  MiniCalendarOptions,
} from "@zealakit/chrono-core/calendar";
import type { WeekdayHeader } from "@zealakit/chrono-core/foundation";
import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  forwardRef,
} from "react";
import { mergeProps } from "../shared/merge-props.js";
import { Part } from "../shared/part.js";
import { composeRefs } from "../shared/slot.js";
import { MiniCalendarContext, useMiniCalendarContext } from "./context.js";
import { splitMiniCalendarProps } from "./options.js";
import { useMiniCalendar } from "./use-mini-calendar.js";

type PartProps<T extends keyof React.JSX.IntrinsicElements> = Omit<
  ComponentPropsWithoutRef<T>,
  "children"
> & { asChild?: boolean };

const withChrono = (consumer: object, chrono: object) =>
  mergeProps(
    consumer as Record<string, unknown>,
    chrono as Record<string, unknown>,
  );

export type MiniCalendarProps = Omit<
  PartProps<"div">,
  keyof MiniCalendarOptions
> &
  MiniCalendarOptions & { children?: ReactNode };

/** A small month calendar, optionally synced with a main `Calendar` through `syncWith`. */
export const MiniCalendar = forwardRef<HTMLElement, MiniCalendarProps>(
  function MiniCalendar({ children, asChild, ...props }, ref) {
    const [options, rest] = splitMiniCalendarProps(props);
    const mini = useMiniCalendar({
      ...options,
      id: (props as { id?: string }).id,
    });
    const { ref: rootRef, ...rootProps } = mini.getRootProps();
    const { id: _id, ...elementProps } = rest;
    return (
      <MiniCalendarContext.Provider value={mini}>
        <Part
          as="div"
          asChild={asChild}
          ref={composeRefs(ref, rootRef)}
          {...withChrono(elementProps, rootProps)}
        >
          {children}
        </Part>
      </MiniCalendarContext.Provider>
    );
  },
);

export type MiniCalendarTitleProps = PartProps<"h2"> & { children?: ReactNode };

export const MiniCalendarTitle = forwardRef<
  HTMLHeadingElement,
  MiniCalendarTitleProps
>(function MiniCalendarTitle({ children, asChild, ...rest }, ref) {
  const mini = useMiniCalendarContext("MiniCalendarTitle");
  return (
    <Part
      as="h2"
      asChild={asChild}
      ref={ref as never}
      {...withChrono(rest, mini.getTitleProps())}
    >
      {children ?? mini.state.title.text}
    </Part>
  );
});

type ButtonProps = PartProps<"button"> & { children?: ReactNode };

type NavButtonProps = ButtonProps & { kind: "prev" | "next"; part: string };

const NavButton = forwardRef<HTMLButtonElement, NavButtonProps>(
  function NavButton({ kind, part, children, asChild, ...rest }, ref) {
    const mini = useMiniCalendarContext(part);
    const props = mini.getNavProps(kind);
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

export const MiniCalendarPrevButton = forwardRef<
  HTMLButtonElement,
  ButtonProps
>(function MiniCalendarPrevButton(props, ref) {
  return (
    <NavButton ref={ref} kind="prev" part="MiniCalendarPrevButton" {...props} />
  );
});

export const MiniCalendarNextButton = forwardRef<
  HTMLButtonElement,
  ButtonProps
>(function MiniCalendarNextButton(props, ref) {
  return (
    <NavButton ref={ref} kind="next" part="MiniCalendarNextButton" {...props} />
  );
});

export type MiniCalendarWeekdayHeaderProps = PartProps<"th"> & {
  header: WeekdayHeader;
  children?: ReactNode;
};

export const MiniCalendarWeekdayHeader = forwardRef<
  HTMLTableCellElement,
  MiniCalendarWeekdayHeaderProps
>(function MiniCalendarWeekdayHeader(
  { header, children, asChild, ...rest },
  ref,
) {
  const mini = useMiniCalendarContext("MiniCalendarWeekdayHeader");
  return (
    <Part
      as="th"
      asChild={asChild}
      ref={ref as never}
      {...withChrono(rest, mini.getColumnHeaderProps(header))}
    >
      {children ?? header.short}
    </Part>
  );
});

export type MiniCalendarCellProps = PartProps<"td"> & {
  day: CalendarDay;
  children?: ReactNode;
};

export const MiniCalendarCell = forwardRef<
  HTMLTableCellElement,
  MiniCalendarCellProps
>(function MiniCalendarCell({ day, children, asChild, ...rest }, ref) {
  const mini = useMiniCalendarContext("MiniCalendarCell");
  return (
    <Part
      as="td"
      asChild={asChild}
      ref={ref as never}
      {...withChrono(rest, mini.getCellProps(day))}
    >
      {children ?? day.date.day}
    </Part>
  );
});

export type MiniCalendarGridProps = PartProps<"table"> & {
  children?: (day: CalendarDay) => ReactNode;
};

export const MiniCalendarGrid = forwardRef<
  HTMLTableElement,
  MiniCalendarGridProps
>(function MiniCalendarGrid({ children, asChild, ...rest }, ref) {
  const mini = useMiniCalendarContext("MiniCalendarGrid");
  const { layout } = mini.state;
  const model = layout.months[0];
  return (
    <Part
      as="table"
      asChild={asChild}
      ref={ref as never}
      {...withChrono(rest, mini.getGridProps())}
    >
      <thead>
        <tr>
          {layout.weekNumbers ? <td /> : null}
          {layout.weekdays.map((header) => (
            <MiniCalendarWeekdayHeader key={header.dayOfWeek} header={header} />
          ))}
        </tr>
      </thead>
      <tbody>
        {model?.weeks.map((week) => (
          <tr key={week.days[0]?.key}>
            {layout.weekNumbers ? (
              <th {...mini.getWeekNumberProps(week.weekNumber)}>
                {week.weekNumber}
              </th>
            ) : null}
            {week.days.map((day) => (
              <MiniCalendarCell key={day.key} day={day}>
                {children ? children(day) : undefined}
              </MiniCalendarCell>
            ))}
          </tr>
        ))}
      </tbody>
    </Part>
  );
});
