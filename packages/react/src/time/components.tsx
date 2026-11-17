"use client";

import type {
  BookingSlot,
  TimeInputOptions,
  TimeInputState,
  TimePanelColumnState,
  TimePanelGroupState,
  TimePanelOptionState,
  TimePanelOptions,
  TimePanelSetState,
  TimeRangeInputOptions,
  TimeRangePanelOptions,
  TimeSegmentView,
} from "@zealakit/chrono-core/time";
import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  forwardRef,
} from "react";
import { mergeProps } from "../shared/merge-props.js";
import { Part } from "../shared/part.js";
import { composeRefs } from "../shared/slot.js";
import {
  TimeFieldContext,
  TimePanelContext,
  type TimePanelContextValue,
  useTimeFieldContext,
  useTimePanelContext,
} from "./context.js";
import {
  splitTimeInputProps,
  splitTimePanelProps,
  splitTimeRangeInputProps,
  splitTimeRangePanelProps,
} from "./options.js";
import { useTimeInput, useTimeRangeInput } from "./use-time-input.js";
import { useTimePanel, useTimeRangePanel } from "./use-time-panel.js";

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

/** Hidden form inputs (plan 06 A15). Rendered on the server too, so forms post without JS. */
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

export type TimeInputSegmentProps = PartProps<"span"> & {
  segment: TimeSegmentView;
  children?: ReactNode;
};

/** One editable part (day, month or year). */
export const TimeInputSegment = forwardRef<
  HTMLSpanElement,
  TimeInputSegmentProps
>(function TimeInputSegment({ segment, children, asChild, ...rest }, ref) {
  const field = useTimeFieldContext("TimeInputSegment");
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

export type TimeInputLiteralProps = PartProps<"span"> & {
  segment: TimeSegmentView;
  children?: ReactNode;
};

/** A separator between parts. Hidden from assistive technology. */
export const TimeInputLiteral = forwardRef<
  HTMLSpanElement,
  TimeInputLiteralProps
>(function TimeInputLiteral({ segment, children, asChild, ...rest }, ref) {
  const field = useTimeFieldContext("TimeInputLiteral");
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

export type TimeInputTextFieldProps = PartProps<"input">;

/** The native text field of `mode="text"`. */
export const TimeInputTextField = forwardRef<
  HTMLInputElement,
  TimeInputTextFieldProps
>(function TimeInputTextField({ asChild, ...rest }, ref) {
  const field = useTimeFieldContext("TimeInputTextField");
  return (
    <Part
      as="input"
      asChild={asChild}
      ref={ref as never}
      {...withChrono(rest, field.getTextFieldProps())}
    />
  );
});

export type TimeInputClearButtonProps = PartProps<"button"> & {
  children?: ReactNode;
};

export const TimeInputClearButton = forwardRef<
  HTMLButtonElement,
  TimeInputClearButtonProps
>(function TimeInputClearButton({ children, asChild, ...rest }, ref) {
  const field = useTimeFieldContext("TimeInputClearButton");
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
  const { state } = useTimeFieldContext("TimeInput");
  if (state.mode === "text") return <TimeInputTextField />;
  return (
    <>
      {state.segments.map((segment, index) =>
        segment.type === "literal" ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: segments are positional
          <TimeInputLiteral key={index} segment={segment} />
        ) : (
          <TimeInputSegment key={segment.type} segment={segment} />
        ),
      )}
    </>
  );
}

export type TimeInputProps = Omit<PartProps<"div">, keyof TimeInputOptions> &
  TimeInputOptions & {
    children?: ReactNode | ((state: TimeInputState) => ReactNode);
  };

/** A time field: segmented (default) or text. Use `TimeInputSegment` parts for custom layouts. */
export const TimeInput = forwardRef<HTMLElement, TimeInputProps>(
  function TimeInput({ children, asChild, ...props }, ref) {
    const [options, rest] = splitTimeInputProps(props);
    const input = useTimeInput({
      ...options,
      id: (props as { id?: string }).id,
    });
    const { ref: rootRef, ...rootProps } = input.getRootProps();
    const { id: _id, ...elementProps } = rest;
    return (
      <TimeFieldContext.Provider value={input}>
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
      </TimeFieldContext.Provider>
    );
  },
);

type RangeFieldProps = PartProps<"div"> & {
  children?: ReactNode | ((state: TimeInputState) => ReactNode);
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
    side === "start" ? "TimeRangeInputStart" : "TimeRangeInputEnd",
  );
  const field = range[side];
  const { ref: rootRef, ...rootProps } = field.getRootProps();
  return (
    <TimeFieldContext.Provider value={field}>
      <Part
        as="div"
        asChild={asChild}
        ref={composeRefs(forwardedRef, rootRef)}
        {...withChrono(rest, {
          ...rootProps,
          role: "group",
          "aria-label":
            field.state.messages[side === "start" ? "startTime" : "endTime"],
        })}
      >
        {typeof children === "function"
          ? children(field.state)
          : (children ?? <FieldContent />)}
      </Part>
    </TimeFieldContext.Provider>
  );
}

import { createContext, useContext } from "react";

type RangeContextValue = ReturnType<typeof useTimeRangeInput>;
const RangeContext = createContext<RangeContextValue | null>(null);
function useRangeContext(part: string): RangeContextValue {
  const value = useContext(RangeContext);
  if (!value) {
    throw new Error(
      `[chrono-react] <${part}> must be used inside <TimeRangeInput>.`,
    );
  }
  return value;
}

export const TimeRangeInputStart = forwardRef<HTMLElement, RangeFieldProps>(
  function TimeRangeInputStart(props, ref) {
    return <RangeField side="start" forwardedRef={ref} {...props} />;
  },
);

export const TimeRangeInputEnd = forwardRef<HTMLElement, RangeFieldProps>(
  function TimeRangeInputEnd(props, ref) {
    return <RangeField side="end" forwardedRef={ref} {...props} />;
  },
);

export type TimeRangeInputProps = Omit<
  PartProps<"div">,
  keyof TimeRangeInputOptions
> &
  TimeRangeInputOptions & { children?: ReactNode };

/** Two time fields (start and end) in one group, in both modes. */
export const TimeRangeInput = forwardRef<HTMLElement, TimeRangeInputProps>(
  function TimeRangeInput({ children, asChild, ...props }, ref) {
    const [options, rest] = splitTimeRangeInputProps(props);
    const range = useTimeRangeInput({
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
              <TimeRangeInputStart />
              <span aria-hidden="true">–</span>
              <TimeRangeInputEnd />
            </>
          )}
          <HiddenInputs inputs={range.state.hidden} />
        </Part>
      </RangeContext.Provider>
    );
  },
);

// ---------------------------------------------------------------- panels

export type TimePanelOptionProps = PartProps<"div"> & {
  option: TimePanelOptionState;
  /** Receives the option and, in slot mode, the app's slot (with its `data`). */
  children?:
    | ReactNode
    | ((
        option: TimePanelOptionState,
        slot: BookingSlot | undefined,
      ) => ReactNode);
};

/** One time (or slot). Custom content can read `slot.data`. */
export const TimePanelOption = forwardRef<HTMLElement, TimePanelOptionProps>(
  function TimePanelOption({ option, children, asChild, ...rest }, ref) {
    const panel = useTimePanelContext("TimePanelOption");
    const slot = panel.controller.getSlot(option.key);
    return (
      <Part
        as="div"
        asChild={asChild}
        ref={ref as never}
        {...withChrono(rest, panel.getOptionProps(option))}
      >
        {typeof children === "function"
          ? children(option, slot)
          : (children ?? option.text)}
      </Part>
    );
  },
);

export type TimePanelColumnProps = PartProps<"div"> & {
  column: TimePanelColumnState;
  children?: ReactNode | ((column: TimePanelColumnState) => ReactNode);
};

/** One column of the columns layout (hour, minute, second, day period). */
export const TimePanelColumn = forwardRef<HTMLElement, TimePanelColumnProps>(
  function TimePanelColumn({ column, children, asChild, ...rest }, ref) {
    const panel = useTimePanelContext("TimePanelColumn");
    return (
      <Part
        as="div"
        asChild={asChild}
        ref={ref as never}
        {...withChrono(rest, panel.getColumnProps(column))}
      >
        {typeof children === "function"
          ? children(column)
          : (children ??
            column.options.map((option) => (
              <TimePanelOption key={option.key} option={option} />
            )))}
      </Part>
    );
  },
);

export type TimePanelGroupProps = PartProps<"div"> & {
  group: TimePanelGroupState;
  children?: ReactNode;
};

export const TimePanelGroup = forwardRef<HTMLElement, TimePanelGroupProps>(
  function TimePanelGroup({ group, children, asChild, ...rest }, ref) {
    const panel = useTimePanelContext("TimePanelGroup");
    return (
      <Part
        as="div"
        asChild={asChild}
        ref={ref as never}
        {...withChrono(rest, panel.getGroupProps(group))}
      >
        {children ??
          group.options.map((option) => (
            <TimePanelOption key={option.key} option={option} />
          ))}
      </Part>
    );
  },
);

export type TimePanelGroupLabelProps = PartProps<"div"> & {
  children?: ReactNode;
};

/** The visible label of a group (hidden from the group's own `aria-label`). */
export const TimePanelGroupLabel = forwardRef<
  HTMLElement,
  TimePanelGroupLabelProps
>(function TimePanelGroupLabel({ children, asChild, ...rest }, ref) {
  return (
    <Part as="div" asChild={asChild} ref={ref as never} {...rest}>
      {children}
    </Part>
  );
});

export type TimePanelListProps = PartProps<"div"> & {
  children?: ReactNode | ((groups: TimePanelGroupState[]) => ReactNode);
};

/** The listbox of the list layout. */
export const TimePanelList = forwardRef<HTMLElement, TimePanelListProps>(
  function TimePanelList({ children, asChild, ...rest }, ref) {
    const panel = useTimePanelContext("TimePanelList");
    const { groups } = panel.state;
    return (
      <Part
        as="div"
        asChild={asChild}
        ref={ref as never}
        {...withChrono(rest, panel.getListProps())}
      >
        {typeof children === "function"
          ? children(groups)
          : (children ??
            groups.map((group) => (
              <TimePanelGroup key={group.key} group={group}>
                {group.label ? (
                  <TimePanelGroupLabel>{group.label}</TimePanelGroupLabel>
                ) : null}
                {group.options.map((option) => (
                  <TimePanelOption key={option.key} option={option} />
                ))}
              </TimePanelGroup>
            )))}
      </Part>
    );
  },
);

function SetContent({ set }: { set: TimePanelSetState }) {
  return (
    <>
      {set.columns.map((column) => (
        <TimePanelColumn key={column.key} column={column} />
      ))}
    </>
  );
}

function RangeSet({
  side,
  children,
  asChild,
  forwardedRef,
  ...rest
}: PartProps<"div"> & {
  side: "start" | "end";
  children?: ReactNode;
  forwardedRef: React.ForwardedRef<HTMLElement>;
}) {
  const panel = useTimePanelContext(
    side === "start" ? "TimeRangePanelStart" : "TimeRangePanelEnd",
  );
  const set = panel.state.sets.find((item) => item.key === side);
  if (!set) return null;
  return (
    <Part
      as="div"
      asChild={asChild}
      ref={forwardedRef as never}
      {...withChrono(rest, panel.getSetProps(set))}
    >
      {children ?? <SetContent set={set} />}
    </Part>
  );
}

/** The start column set of a range panel in the columns layout. */
export const TimeRangePanelStart = forwardRef<
  HTMLElement,
  PartProps<"div"> & { children?: ReactNode }
>(function TimeRangePanelStart(props, ref) {
  return <RangeSet side="start" forwardedRef={ref} {...props} />;
});

export const TimeRangePanelEnd = forwardRef<
  HTMLElement,
  PartProps<"div"> & { children?: ReactNode }
>(function TimeRangePanelEnd(props, ref) {
  return <RangeSet side="end" forwardedRef={ref} {...props} />;
});

function PanelContent() {
  const panel = useTimePanelContext("TimePanel");
  const { state } = panel;
  if (state.layout === "list") return <TimePanelList />;
  return (
    <>
      {state.sets.map((set) =>
        state.kind === "range" ? (
          set.key === "start" ? (
            <TimeRangePanelStart key={set.key} />
          ) : (
            <TimeRangePanelEnd key={set.key} />
          )
        ) : (
          <SetContent key={set.key} set={set} />
        ),
      )}
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
  panel: TimePanelContextValue;
  forwardedRef: React.ForwardedRef<HTMLElement>;
  asChild?: boolean;
  children?: ReactNode;
  rest: Record<string, unknown>;
}) {
  const { ref: rootRef, ...rootProps } = panel.getRootProps();
  const { id: _id, ...elementProps } = rest;
  return (
    <TimePanelContext.Provider value={panel}>
      <Part
        as="div"
        asChild={asChild}
        ref={composeRefs(forwardedRef, rootRef)}
        {...withChrono(elementProps, rootProps)}
      >
        {children ?? <PanelContent />}
      </Part>
    </TimePanelContext.Provider>
  );
}

export type TimePanelProps = Omit<PartProps<"div">, keyof TimePanelOptions> &
  TimePanelOptions & { children?: ReactNode };

/** A single-time panel: columns (default) or a list of times or slots. */
export const TimePanel = forwardRef<HTMLElement, TimePanelProps>(
  function TimePanel({ children, asChild, ...props }, ref) {
    const [options, rest] = splitTimePanelProps(props);
    const panel = useTimePanel({
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

export type TimeRangePanelProps = Omit<
  PartProps<"div">,
  keyof TimeRangePanelOptions
> &
  TimeRangePanelOptions & { children?: ReactNode };

/** A range panel (two picks): a list (default) or two column sets. */
export const TimeRangePanel = forwardRef<HTMLElement, TimeRangePanelProps>(
  function TimeRangePanel({ children, asChild, ...props }, ref) {
    const [options, rest] = splitTimeRangePanelProps(props);
    const panel = useTimeRangePanel({
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
