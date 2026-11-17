"use client";

import type {
  DateInputOptions,
  DateInputState,
  DatePanelOptions,
  DateRangeInputOptions,
  DateRangePanelOptions,
  MultiDatePanelOptions,
  PanelCell,
  PanelDay,
  SegmentView,
} from "@zealakit/chrono-core/date";
import type { WeekdayHeader } from "@zealakit/chrono-core/foundation";
import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  forwardRef,
} from "react";
import { mergeProps } from "../shared/merge-props.js";
import { Part } from "../shared/part.js";
import { composeRefs } from "../shared/slot.js";
import {
  DateFieldContext,
  DatePanelContext,
  type DatePanelContextValue,
  useDateFieldContext,
  useDatePanelContext,
} from "./context.js";
import {
  splitDateInputProps,
  splitDatePanelProps,
  splitDateRangeInputProps,
  splitDateRangePanelProps,
  splitMultiDatePanelProps,
} from "./options.js";
import { useDateInput, useDateRangeInput } from "./use-date-input.js";
import {
  useDatePanel,
  useDateRangePanel,
  useMultiDatePanel,
} from "./use-date-panel.js";

type PartProps<T extends keyof React.JSX.IntrinsicElements> = Omit<
  ComponentPropsWithoutRef<T>,
  "children"
> & { asChild?: boolean };

const withChrono = (consumer: object, chrono: object) =>
  mergeProps(
    consumer as Record<string, unknown>,
    chrono as Record<string, unknown>,
  );

// ---------------------------------------------------------------- inputs

type HiddenProps = { inputs: { name: string; value: string }[] };

/** Hidden form inputs (A15). Rendered on the server too, so forms post without JS. */
function HiddenInputs({ inputs }: HiddenProps) {
  return (
    <>
      {inputs.map((input) => (
        <input
          key={`${input.name}:${input.value}`}
          type="hidden"
          name={input.name}
          value={input.value}
        />
      ))}
    </>
  );
}

export type DateInputSegmentProps = PartProps<"span"> & {
  segment: SegmentView;
  children?: ReactNode;
};

/** One editable part (day, month or year). */
export const DateInputSegment = forwardRef<
  HTMLSpanElement,
  DateInputSegmentProps
>(function DateInputSegment({ segment, children, asChild, ...rest }, ref) {
  const field = useDateFieldContext("DateInputSegment");
  return (
    <Part
      as="span"
      asChild={asChild}
      ref={ref as never}
      {...withChrono(rest, field.getSegmentProps(segment))}
    >
      {children ?? segment.text}
    </Part>
  );
});

export type DateInputLiteralProps = PartProps<"span"> & {
  segment: SegmentView;
  children?: ReactNode;
};

/** A separator between parts. Hidden from assistive technology. */
export const DateInputLiteral = forwardRef<
  HTMLSpanElement,
  DateInputLiteralProps
>(function DateInputLiteral({ segment, children, asChild, ...rest }, ref) {
  const field = useDateFieldContext("DateInputLiteral");
  return (
    <Part
      as="span"
      asChild={asChild}
      ref={ref as never}
      {...withChrono(rest, field.getSegmentProps(segment))}
    >
      {children ?? segment.text}
    </Part>
  );
});

export type DateInputTextFieldProps = PartProps<"input">;

/** The native text field of `mode="text"`. */
export const DateInputTextField = forwardRef<
  HTMLInputElement,
  DateInputTextFieldProps
>(function DateInputTextField({ asChild, ...rest }, ref) {
  const field = useDateFieldContext("DateInputTextField");
  return (
    <Part
      as="input"
      asChild={asChild}
      ref={ref as never}
      {...withChrono(rest, field.getTextFieldProps())}
    />
  );
});

export type DateInputClearButtonProps = PartProps<"button"> & {
  children?: ReactNode;
};

export const DateInputClearButton = forwardRef<
  HTMLButtonElement,
  DateInputClearButtonProps
>(function DateInputClearButton({ children, asChild, ...rest }, ref) {
  const field = useDateFieldContext("DateInputClearButton");
  const props = field.getClearButtonProps();
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
});

/** The default content of a field: segments, or the text field. */
function FieldContent() {
  const { state } = useDateFieldContext("DateInput");
  if (state.mode === "text") return <DateInputTextField />;
  return (
    <>
      {state.segments.map((segment, index) =>
        segment.type === "literal" ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: segments are positional
          <DateInputLiteral key={index} segment={segment} />
        ) : (
          <DateInputSegment key={segment.type} segment={segment} />
        ),
      )}
    </>
  );
}

export type DateInputProps = Omit<PartProps<"div">, keyof DateInputOptions> &
  DateInputOptions & {
    children?: ReactNode | ((state: DateInputState) => ReactNode);
  };

/** A date field: segmented (default) or text. Use `DateInputSegment` parts for custom layouts. */
export const DateInput = forwardRef<HTMLElement, DateInputProps>(
  function DateInput({ children, asChild, ...props }, ref) {
    const [options, rest] = splitDateInputProps(props);
    const input = useDateInput({
      ...options,
      id: (props as { id?: string }).id,
    });
    const { ref: rootRef, ...rootProps } = input.getRootProps();
    const { id: _id, ...elementProps } = rest;
    return (
      <DateFieldContext.Provider value={input}>
        <Part
          as="div"
          asChild={asChild}
          ref={composeRefs(ref, rootRef)}
          {...withChrono(elementProps, rootProps)}
        >
          {typeof children === "function"
            ? children(input.state)
            : (children ?? <FieldContent />)}
          <HiddenInputs inputs={input.state.hidden} />
        </Part>
      </DateFieldContext.Provider>
    );
  },
);

type RangeFieldProps = PartProps<"div"> & {
  children?: ReactNode | ((state: DateInputState) => ReactNode);
};

function RangeField({
  side,
  children,
  asChild,
  forwardedRef,
  ...rest
}: RangeFieldProps & {
  side: "start" | "end";
  forwardedRef: React.ForwardedRef<HTMLElement>;
}) {
  const range = useRangeContext(
    side === "start" ? "DateRangeInputStart" : "DateRangeInputEnd",
  );
  const field = range[side];
  const { ref: rootRef, ...rootProps } = field.getRootProps();
  return (
    <DateFieldContext.Provider value={field}>
      <Part
        as="div"
        asChild={asChild}
        ref={composeRefs(forwardedRef, rootRef)}
        {...withChrono(rest, {
          ...rootProps,
          role: "group",
          "aria-label":
            field.state.messages[side === "start" ? "startDate" : "endDate"],
        })}
      >
        {typeof children === "function"
          ? children(field.state)
          : (children ?? <FieldContent />)}
      </Part>
    </DateFieldContext.Provider>
  );
}

import { createContext, useContext } from "react";

type RangeContextValue = ReturnType<typeof useDateRangeInput>;
const RangeContext = createContext<RangeContextValue | null>(null);
function useRangeContext(part: string): RangeContextValue {
  const value = useContext(RangeContext);
  if (!value) {
    throw new Error(
      `[chrono-react] <${part}> must be used inside <DateRangeInput>.`,
    );
  }
  return value;
}

export const DateRangeInputStart = forwardRef<HTMLElement, RangeFieldProps>(
  function DateRangeInputStart(props, ref) {
    return <RangeField side="start" forwardedRef={ref} {...props} />;
  },
);

export const DateRangeInputEnd = forwardRef<HTMLElement, RangeFieldProps>(
  function DateRangeInputEnd(props, ref) {
    return <RangeField side="end" forwardedRef={ref} {...props} />;
  },
);

export type DateRangeInputProps = Omit<
  PartProps<"div">,
  keyof DateRangeInputOptions
> &
  DateRangeInputOptions & { children?: ReactNode };

/** Two date fields (start and end) in one group, in both modes. */
export const DateRangeInput = forwardRef<HTMLElement, DateRangeInputProps>(
  function DateRangeInput({ children, asChild, ...props }, ref) {
    const [options, rest] = splitDateRangeInputProps(props);
    const range = useDateRangeInput({
      ...options,
      id: (props as { id?: string }).id,
    });
    const { ref: rootRef, ...rootProps } = range.getRootProps();
    const { id: _id, ...elementProps } = rest;
    return (
      <RangeContext.Provider value={range}>
        <Part
          as="div"
          asChild={asChild}
          ref={composeRefs(ref, rootRef)}
          {...withChrono(elementProps, rootProps)}
        >
          {children ?? (
            <>
              <DateRangeInputStart />
              <span aria-hidden="true">–</span>
              <DateRangeInputEnd />
            </>
          )}
          <HiddenInputs inputs={range.state.hidden} />
        </Part>
      </RangeContext.Provider>
    );
  },
);

// ---------------------------------------------------------------- panels

export type DatePanelTitleProps = PartProps<"h2"> & { children?: ReactNode };

export const DatePanelTitle = forwardRef<
  HTMLHeadingElement,
  DatePanelTitleProps
>(function DatePanelTitle({ children, asChild, ...rest }, ref) {
  const panel = useDatePanelContext("DatePanelTitle");
  return (
    <Part
      as="h2"
      asChild={asChild}
      ref={ref as never}
      {...withChrono(rest, panel.getTitleProps())}
    >
      {children ?? panel.state.title}
    </Part>
  );
});

type ButtonProps = PartProps<"button"> & { children?: ReactNode };

/** The title as a button: day level to month level to year level. */
export const DatePanelLevelButton = forwardRef<HTMLButtonElement, ButtonProps>(
  function DatePanelLevelButton({ children, asChild, ...rest }, ref) {
    const panel = useDatePanelContext("DatePanelLevelButton");
    return (
      <Part
        as="button"
        asChild={asChild}
        ref={ref as never}
        {...withChrono(rest, panel.getLevelButtonProps())}
      >
        {children ?? panel.state.title}
      </Part>
    );
  },
);

const NavButton = forwardRef<
  HTMLButtonElement,
  ButtonProps & { kind: "prev" | "next"; part: string }
>(function NavButton({ kind, part, children, asChild, ...rest }, ref) {
  const panel = useDatePanelContext(part);
  const props = panel.getNavProps(kind);
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
});

export const DatePanelPrevButton = forwardRef<HTMLButtonElement, ButtonProps>(
  function DatePanelPrevButton(props, ref) {
    return (
      <NavButton ref={ref} kind="prev" part="DatePanelPrevButton" {...props} />
    );
  },
);

export const DatePanelNextButton = forwardRef<HTMLButtonElement, ButtonProps>(
  function DatePanelNextButton(props, ref) {
    return (
      <NavButton ref={ref} kind="next" part="DatePanelNextButton" {...props} />
    );
  },
);

/** Shows today's month; with `selectToday` it also picks today. */
export const DatePanelTodayButton = forwardRef<HTMLButtonElement, ButtonProps>(
  function DatePanelTodayButton({ children, asChild, ...rest }, ref) {
    const panel = useDatePanelContext("DatePanelTodayButton");
    const props = panel.getTodayButtonProps();
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

export type DatePanelWeekdayHeaderProps = PartProps<"th"> & {
  header: WeekdayHeader;
  children?: ReactNode;
};

export const DatePanelWeekdayHeader = forwardRef<
  HTMLTableCellElement,
  DatePanelWeekdayHeaderProps
>(function DatePanelWeekdayHeader({ header, children, asChild, ...rest }, ref) {
  const panel = useDatePanelContext("DatePanelWeekdayHeader");
  return (
    <Part
      as="th"
      asChild={asChild}
      ref={ref as never}
      {...withChrono(rest, panel.getColumnHeaderProps(header))}
    >
      {children ?? header.short}
    </Part>
  );
});

export type DatePanelWeekNumberProps = PartProps<"th"> & {
  weekNumber: number;
  children?: ReactNode;
};

export const DatePanelWeekNumber = forwardRef<
  HTMLTableCellElement,
  DatePanelWeekNumberProps
>(function DatePanelWeekNumber(
  { weekNumber, children, asChild, ...rest },
  ref,
) {
  const panel = useDatePanelContext("DatePanelWeekNumber");
  return (
    <Part
      as="th"
      asChild={asChild}
      ref={ref as never}
      {...withChrono(rest, panel.getWeekNumberProps(weekNumber))}
    >
      {children ?? weekNumber}
    </Part>
  );
});

export type DatePanelCellProps = PartProps<"td"> &
  ({ day: PanelDay; cell?: never } | { cell: PanelCell; day?: never }) & {
    children?: ReactNode;
  };

/** A day cell (`day`) or, at the month and year levels, a month or year cell (`cell`). */
export const DatePanelCell = forwardRef<
  HTMLTableCellElement,
  DatePanelCellProps
>(function DatePanelCell({ day, cell, children, asChild, ...rest }, ref) {
  const panel = useDatePanelContext("DatePanelCell");
  const chrono = day
    ? panel.getCellProps(day)
    : panel.getLevelCellProps(cell as PanelCell);
  const fallback = day
    ? day.hidden
      ? null
      : day.date.day
    : (cell as PanelCell).text;
  return (
    <Part
      as="td"
      asChild={asChild}
      ref={ref as never}
      {...withChrono(rest, chrono)}
    >
      {children ?? fallback}
    </Part>
  );
});

export type DatePanelGridProps = PartProps<"table"> & {
  /** Index of the month grid in a multi-month panel. */
  month?: number;
  /** Content of each day cell. Defaults to the day number. */
  children?: (day: PanelDay) => ReactNode;
};

/** The grid of the current level. Month and year levels render in the first grid only. */
export const DatePanelGrid = forwardRef<HTMLTableElement, DatePanelGridProps>(
  function DatePanelGrid({ month = 0, children, asChild, ...rest }, ref) {
    const panel = useDatePanelContext("DatePanelGrid");
    const { state } = panel;
    let body: ReactNode = null;
    if (state.level === "day") {
      const model = state.months[month];
      if (!model) return null;
      body = (
        <>
          <thead>
            <tr>
              {state.weekNumbers ? <td /> : null}
              {state.weekdays.map((header) => (
                <DatePanelWeekdayHeader
                  key={header.dayOfWeek}
                  header={header}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {model.weeks.map((week) => (
              <tr
                key={`${model.key}-${week.days[0]?.date.day}-${week.days[0]?.date.month}`}
              >
                {state.weekNumbers ? (
                  <DatePanelWeekNumber weekNumber={week.weekNumber} />
                ) : null}
                {week.days.map((day) => (
                  <DatePanelCell
                    key={`${day.date.month}-${day.date.day}`}
                    day={day}
                  >
                    {day.hidden ? null : children?.(day)}
                  </DatePanelCell>
                ))}
              </tr>
            ))}
          </tbody>
        </>
      );
    } else {
      if (month !== 0) return null;
      const rows: PanelCell[][] = [];
      state.cells.forEach((cell, index) => {
        if (index % 4 === 0) rows.push([]);
        rows[rows.length - 1]?.push(cell);
      });
      body = (
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]?.key}>
              {row.map((cell) => (
                <DatePanelCell key={cell.key} cell={cell} />
              ))}
            </tr>
          ))}
        </tbody>
      );
    }
    return (
      <Part
        as="table"
        asChild={asChild}
        ref={ref as never}
        {...withChrono(rest, panel.getGridProps())}
      >
        {body}
      </Part>
    );
  },
);

function PanelContent() {
  const panel = useDatePanelContext("DatePanel");
  const count = panel.state.level === "day" ? panel.state.months.length : 1;
  return (
    <>
      <DatePanelPrevButton />
      <DatePanelTitle />
      <DatePanelNextButton />
      {Array.from({ length: count }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: grids are positional
        <DatePanelGrid key={index} month={index} />
      ))}
    </>
  );
}

function PanelRoot({
  panel,
  forwardedRef,
  asChild,
  children,
  rest,
}: {
  panel: DatePanelContextValue;
  forwardedRef: React.ForwardedRef<HTMLElement>;
  asChild?: boolean;
  children?: ReactNode;
  rest: Record<string, unknown>;
}) {
  const { ref: rootRef, ...rootProps } = panel.getRootProps();
  const { id: _id, ...elementProps } = rest;
  return (
    <DatePanelContext.Provider value={panel}>
      <Part
        as="div"
        asChild={asChild}
        ref={composeRefs(forwardedRef, rootRef)}
        {...withChrono(elementProps, rootProps)}
      >
        {children ?? <PanelContent />}
      </Part>
    </DatePanelContext.Provider>
  );
}

export type DatePanelProps = Omit<PartProps<"div">, keyof DatePanelOptions> &
  DatePanelOptions & { children?: ReactNode };

/** A single-date panel. Compose it with `DatePanelGrid` and friends, or render it bare. */
export const DatePanel = forwardRef<HTMLElement, DatePanelProps>(
  function DatePanel({ children, asChild, ...props }, ref) {
    const [options, rest] = splitDatePanelProps(props);
    const panel = useDatePanel({
      ...options,
      id: (props as { id?: string }).id,
    });
    return (
      <PanelRoot
        panel={panel as never}
        forwardedRef={ref}
        asChild={asChild}
        rest={rest}
      >
        {children}
      </PanelRoot>
    );
  },
);

export type DateRangePanelProps = Omit<
  PartProps<"div">,
  keyof DateRangePanelOptions
> &
  DateRangePanelOptions & { children?: ReactNode };

/** A range panel (two picks). Shows two months by default. */
export const DateRangePanel = forwardRef<HTMLElement, DateRangePanelProps>(
  function DateRangePanel({ children, asChild, months = 2, ...props }, ref) {
    const [options, rest] = splitDateRangePanelProps(props);
    const panel = useDateRangePanel({
      ...options,
      months,
      id: (props as { id?: string }).id,
    });
    return (
      <PanelRoot
        panel={panel as never}
        forwardedRef={ref}
        asChild={asChild}
        rest={rest}
      >
        {children}
      </PanelRoot>
    );
  },
);

export type MultiDatePanelProps = Omit<
  PartProps<"div">,
  keyof MultiDatePanelOptions
> &
  MultiDatePanelOptions & { children?: ReactNode };

/** A panel that selects any number of dates. */
export const MultiDatePanel = forwardRef<HTMLElement, MultiDatePanelProps>(
  function MultiDatePanel({ children, asChild, ...props }, ref) {
    const [options, rest] = splitMultiDatePanelProps(props);
    const panel = useMultiDatePanel({
      ...options,
      id: (props as { id?: string }).id,
    });
    return (
      <PanelRoot
        panel={panel as never}
        forwardedRef={ref}
        asChild={asChild}
        rest={rest}
      >
        {children}
      </PanelRoot>
    );
  },
);
