"use client";

import type {
  DateTimeInputOptions,
  DateTimeInputState,
  DateTimePanelOptions,
  DateTimeRangeInputOptions,
  DateTimeRangePanelOptions,
  DateTimeSegmentView,
} from "@zealakit/chrono-core/datetime";
import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  createContext,
  forwardRef,
  useContext,
} from "react";
import {
  DatePanelGrid,
  DatePanelNextButton,
  DatePanelPrevButton,
  DatePanelTitle,
} from "../date/components.js";
import { DatePanelContext } from "../date/context.js";
import { mergeProps } from "../shared/merge-props.js";
import { Part } from "../shared/part.js";
import { composeRefs } from "../shared/slot.js";
import { TimePanelColumn, TimePanelList } from "../time/components.js";
import { TimePanelContext } from "../time/context.js";
import {
  DateTimeFieldContext,
  DateTimePanelContext,
  type DateTimePanelContextValue,
  useDateTimeFieldContext,
  useDateTimePanelContext,
} from "./context.js";
import {
  splitDateTimeInputProps,
  splitDateTimePanelProps,
  splitDateTimeRangeInputProps,
  splitDateTimeRangePanelProps,
} from "./options.js";
import {
  useDateTimeInput,
  useDateTimeRangeInput,
} from "./use-datetime-input.js";
import {
  useDateTimePanel,
  useDateTimeRangePanel,
} from "./use-datetime-panel.js";

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

export type DateTimeInputSegmentProps = PartProps<"span"> & {
  segment: DateTimeSegmentView;
  children?: ReactNode;
};

/** Any date or time part of the segmented input. */
export const DateTimeInputSegment = forwardRef<
  HTMLSpanElement,
  DateTimeInputSegmentProps
>(function DateTimeInputSegment({ segment, children, asChild, ...rest }, ref) {
  const field = useDateTimeFieldContext("DateTimeInputSegment");
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

export const DateTimeInputLiteral = forwardRef<
  HTMLSpanElement,
  DateTimeInputSegmentProps
>(function DateTimeInputLiteral({ segment, children, asChild, ...rest }, ref) {
  const field = useDateTimeFieldContext("DateTimeInputLiteral");
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

/** The native date field of `mode="text"`. */
export const DateTimeInputDateField = forwardRef<
  HTMLInputElement,
  PartProps<"input">
>(function DateTimeInputDateField({ asChild, ...rest }, ref) {
  const field = useDateTimeFieldContext("DateTimeInputDateField");
  return (
    <Part
      as="input"
      asChild={asChild}
      ref={ref as never}
      {...withChrono(rest, field.getDateFieldProps())}
    />
  );
});

/** The native time field of `mode="text"`. */
export const DateTimeInputTimeField = forwardRef<
  HTMLInputElement,
  PartProps<"input">
>(function DateTimeInputTimeField({ asChild, ...rest }, ref) {
  const field = useDateTimeFieldContext("DateTimeInputTimeField");
  return (
    <Part
      as="input"
      asChild={asChild}
      ref={ref as never}
      {...withChrono(rest, field.getTimeFieldProps())}
    />
  );
});

export const DateTimeInputClearButton = forwardRef<
  HTMLButtonElement,
  PartProps<"button"> & { children?: ReactNode }
>(function DateTimeInputClearButton({ children, asChild, ...rest }, ref) {
  const field = useDateTimeFieldContext("DateTimeInputClearButton");
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

/** The display zone as read-only text (plan 08 X11). It is useful context, so it is not `aria-hidden`. */
export const DateTimeInputTimeZone = forwardRef<
  HTMLSpanElement,
  PartProps<"span"> & { children?: ReactNode }
>(function DateTimeInputTimeZone({ children, asChild, ...rest }, ref) {
  const field = useDateTimeFieldContext("DateTimeInputTimeZone");
  if (!field.state.zoneLabel) return null;
  return (
    <Part as="span" asChild={asChild} ref={ref as never} {...rest}>
      {children ?? field.state.zoneLabel}
    </Part>
  );
});

function FieldContent() {
  const { state } = useDateTimeFieldContext("DateTimeInput");
  if (state.mode === "text") {
    return (
      <>
        <DateTimeInputDateField />
        <DateTimeInputTimeField />
      </>
    );
  }
  return (
    <>
      {state.segments.map((segment, index) =>
        segment.type === "literal" ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: segments are positional
          <DateTimeInputLiteral key={index} segment={segment} />
        ) : (
          <DateTimeInputSegment key={segment.type} segment={segment} />
        ),
      )}
    </>
  );
}

const HiddenInputs = ({
  inputs,
}: {
  inputs: { name: string; value: string }[];
}) => (
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

export type DateTimeInputProps = Omit<
  PartProps<"div">,
  keyof DateTimeInputOptions
> &
  DateTimeInputOptions & {
    children?: ReactNode | ((state: DateTimeInputState) => ReactNode);
  };

/** A date-time field: one group of segments, or a date field and a time field. */
export const DateTimeInput = forwardRef<HTMLElement, DateTimeInputProps>(
  function DateTimeInput({ children, asChild, ...props }, ref) {
    const [options, rest] = splitDateTimeInputProps(props);
    const input = useDateTimeInput({
      ...options,
      id: (props as { id?: string }).id,
    });
    const { ref: rootRef, ...rootProps } = input.getRootProps();
    const { id: _id, ...elementProps } = rest;
    return (
      <DateTimeFieldContext.Provider value={input}>
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
      </DateTimeFieldContext.Provider>
    );
  },
);

type RangeContextValue = ReturnType<typeof useDateTimeRangeInput>;
const RangeContext = createContext<RangeContextValue | null>(null);

function RangeField({
  side,
  children,
  asChild,
  forwardedRef,
  ...rest
}: PartProps<"div"> & {
  side: "start" | "end";
  children?: ReactNode | ((state: DateTimeInputState) => ReactNode);
  forwardedRef: React.ForwardedRef<HTMLElement>;
}) {
  const range = useContext(RangeContext);
  if (!range)
    throw new Error(
      `[chrono-react] <DateTimeRangeInput${side === "start" ? "Start" : "End"}> must be used inside <DateTimeRangeInput>.`,
    );
  const field = range[side];
  const { ref: rootRef, ...rootProps } = field.getRootProps();
  return (
    <DateTimeFieldContext.Provider value={field}>
      <Part
        as="div"
        asChild={asChild}
        ref={composeRefs(forwardedRef, rootRef)}
        {...withChrono(rest, {
          ...rootProps,
          role: "group",
          "aria-label":
            field.state.messages[
              side === "start" ? "startDateTime" : "endDateTime"
            ],
        })}
      >
        {typeof children === "function"
          ? children(field.state)
          : (children ?? <FieldContent />)}
      </Part>
    </DateTimeFieldContext.Provider>
  );
}

export const DateTimeRangeInputStart = forwardRef<
  HTMLElement,
  PartProps<"div"> & { children?: ReactNode }
>(function DateTimeRangeInputStart(props, ref) {
  return <RangeField side="start" forwardedRef={ref} {...props} />;
});

export const DateTimeRangeInputEnd = forwardRef<
  HTMLElement,
  PartProps<"div"> & { children?: ReactNode }
>(function DateTimeRangeInputEnd(props, ref) {
  return <RangeField side="end" forwardedRef={ref} {...props} />;
});

export type DateTimeRangeInputProps = Omit<
  PartProps<"div">,
  keyof DateTimeRangeInputOptions
> &
  DateTimeRangeInputOptions & { children?: ReactNode };

/** Two date-time fields (start and end) in one group. */
export const DateTimeRangeInput = forwardRef<
  HTMLElement,
  DateTimeRangeInputProps
>(function DateTimeRangeInput({ children, asChild, ...props }, ref) {
  const [options, rest] = splitDateTimeRangeInputProps(props);
  const range = useDateTimeRangeInput({
    ...options,
    id: (props as { id?: string }).id,
  });
  const { id: _id, ...elementProps } = rest;
  return (
    <RangeContext.Provider value={range}>
      <Part
        as="div"
        asChild={asChild}
        ref={ref as never}
        {...withChrono(elementProps, range.getRootProps())}
      >
        {children ?? (
          <>
            <DateTimeRangeInputStart />
            <span aria-hidden="true">–</span>
            <DateTimeRangeInputEnd />
          </>
        )}
        <HiddenInputs inputs={range.state.hidden} />
      </Part>
    </RangeContext.Provider>
  );
});

// ---------------------------------------------------------------- panels

function DefaultDate() {
  return (
    <>
      <DatePanelPrevButton />
      <DatePanelTitle />
      <DatePanelNextButton />
      <DatePanelGrid />
    </>
  );
}

function DefaultTime({ which }: { which: "value" | "start" | "end" }) {
  const panel = useDateTimePanelContext("DateTimePanelTime") as unknown as {
    state: {
      time?: { layout: string; sets: { columns: never[] }[] };
      startTime?: { layout: string; sets: { columns: never[] }[] };
      endTime?: { layout: string; sets: { columns: never[] }[] };
    };
  };
  const state =
    which === "start"
      ? panel.state.startTime
      : which === "end"
        ? panel.state.endTime
        : panel.state.time;
  if (!state) return null;
  if (state.layout === "list") return <TimePanelList />;
  return (
    <>
      {(state.sets[0]?.columns ?? []).map((column: { key: string }) => (
        <TimePanelColumn key={column.key} column={column as never} />
      ))}
    </>
  );
}

type ContainerProps = PartProps<"div"> & { children?: ReactNode };

/** Provides the Date panel context: put `DatePanelGrid`, `DatePanelCell`... from `/date` inside. */
export const DateTimePanelDate = forwardRef<HTMLElement, ContainerProps>(
  function DateTimePanelDate({ children, asChild, ...rest }, ref) {
    const panel = useDateTimePanelContext("DateTimePanelDate");
    const { ref: rootRef, ...rootProps } = panel.date.getRootProps();
    return (
      <DatePanelContext.Provider value={panel.date as never}>
        <Part
          as="div"
          asChild={asChild}
          ref={composeRefs(ref, rootRef)}
          {...withChrono(rest, rootProps)}
        >
          {children ?? <DefaultDate />}
        </Part>
      </DatePanelContext.Provider>
    );
  },
);

/** Provides the Time panel context: put `TimePanelColumn`, `TimePanelOption`... from `/time` inside. */
export const DateTimePanelTime = forwardRef<HTMLElement, ContainerProps>(
  function DateTimePanelTime({ children, asChild, ...rest }, ref) {
    const panel = useDateTimePanelContext(
      "DateTimePanelTime",
    ) as DateTimePanelContextValue & { time: never };
    const time = (
      panel as unknown as {
        time: { getRootProps(): { ref: never } & Record<string, unknown> };
      }
    ).time;
    const { ref: rootRef, ...rootProps } = time.getRootProps();
    return (
      <TimePanelContext.Provider value={time as never}>
        <Part
          as="div"
          asChild={asChild}
          ref={composeRefs(ref, rootRef)}
          {...withChrono(rest, rootProps)}
        >
          {children ?? <DefaultTime which="value" />}
        </Part>
      </TimePanelContext.Provider>
    );
  },
);

/** The date range panel context of a range panel. */
export const DateTimeRangePanelDate = DateTimePanelDate;

function RangeTime({
  which,
  children,
  asChild,
  forwardedRef,
  ...rest
}: ContainerProps & {
  which: "startTime" | "endTime";
  forwardedRef: React.ForwardedRef<HTMLElement>;
}) {
  const panel = useDateTimePanelContext(
    which === "startTime"
      ? "DateTimeRangePanelStartTime"
      : "DateTimeRangePanelEndTime",
  );
  const time = (
    panel as unknown as Record<
      string,
      { getRootProps(): { ref: never } & Record<string, unknown> }
    >
  )[which];
  if (!time) return null;
  const { ref: rootRef, ...rootProps } = time.getRootProps();
  return (
    <TimePanelContext.Provider value={time as never}>
      <Part
        as="div"
        asChild={asChild}
        ref={composeRefs(forwardedRef, rootRef)}
        {...withChrono(rest, rootProps)}
      >
        {children ?? (
          <DefaultTime which={which === "startTime" ? "start" : "end"} />
        )}
      </Part>
    </TimePanelContext.Provider>
  );
}

export const DateTimeRangePanelStartTime = forwardRef<
  HTMLElement,
  ContainerProps
>(function DateTimeRangePanelStartTime(props, ref) {
  return <RangeTime which="startTime" forwardedRef={ref} {...props} />;
});

export const DateTimeRangePanelEndTime = forwardRef<
  HTMLElement,
  ContainerProps
>(function DateTimeRangePanelEndTime(props, ref) {
  return <RangeTime which="endTime" forwardedRef={ref} {...props} />;
});

function PanelRoot({
  panel,
  forwardedRef,
  asChild,
  children,
  rest,
  range,
}: {
  panel: DateTimePanelContextValue;
  forwardedRef: React.ForwardedRef<HTMLElement>;
  asChild?: boolean;
  children?: ReactNode;
  rest: Record<string, unknown>;
  range: boolean;
}) {
  const { id: _id, ...elementProps } = rest;
  return (
    <DateTimePanelContext.Provider value={panel}>
      <Part
        as="div"
        asChild={asChild}
        ref={forwardedRef as never}
        {...withChrono(elementProps, panel.getRootProps())}
      >
        {children ??
          (range ? (
            <>
              <DateTimePanelDate />
              <DateTimeRangePanelStartTime />
              <DateTimeRangePanelEndTime />
            </>
          ) : (
            <>
              <DateTimePanelDate />
              <DateTimePanelTime />
            </>
          ))}
      </Part>
    </DateTimePanelContext.Provider>
  );
}

export type DateTimePanelProps = Omit<
  PartProps<"div">,
  keyof DateTimePanelOptions
> &
  DateTimePanelOptions & { children?: ReactNode };

/** A date panel and a time panel composed by one controller. */
export const DateTimePanel = forwardRef<HTMLElement, DateTimePanelProps>(
  function DateTimePanel({ children, asChild, ...props }, ref) {
    const [options, rest] = splitDateTimePanelProps(props);
    const panel = useDateTimePanel({
      ...options,
      id: (props as { id?: string }).id,
    });
    return (
      <PanelRoot
        panel={panel}
        forwardedRef={ref}
        asChild={asChild}
        rest={rest}
        range={false}
      >
        {children}
      </PanelRoot>
    );
  },
);

export type DateTimeRangePanelProps = Omit<
  PartProps<"div">,
  keyof DateTimeRangePanelOptions
> &
  DateTimeRangePanelOptions & { children?: ReactNode };

/** A date range panel with a start time and an end time. */
export const DateTimeRangePanel = forwardRef<
  HTMLElement,
  DateTimeRangePanelProps
>(function DateTimeRangePanel({ children, asChild, ...props }, ref) {
  const [options, rest] = splitDateTimeRangePanelProps(props);
  const panel = useDateTimeRangePanel({
    ...options,
    id: (props as { id?: string }).id,
  });
  return (
    <PanelRoot
      panel={panel}
      forwardedRef={ref}
      asChild={asChild}
      rest={rest}
      range
    >
      {children}
    </PanelRoot>
  );
});
