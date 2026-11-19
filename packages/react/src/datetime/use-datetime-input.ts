"use client";

import {
  type DateTimeInputController,
  type DateTimeInputOptions,
  type DateTimeInputState,
  type DateTimeRangeInputOptions,
  type DateTimeSegmentView,
  createDateTimeInputController,
  createDateTimeRangeInputController,
} from "@zealakit/chrono-core/datetime";
import { focusPart } from "@zealakit/chrono-core/foundation";
import {
  type ClipboardEvent,
  type FocusEvent,
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

/** Prop getters for one date-time field (a single input, or one end of a range). */
function useField(
  controller: DateTimeInputController,
  state: DateTimeInputState,
  onReset: () => void,
  onBlurOutside: () => void,
) {
  const rootRef = useRef<HTMLElement | null>(null);
  const move = useRef(false);

  useIsomorphicLayoutEffect(() => {
    if (!move.current || !rootRef.current) return;
    focusPart(rootRef.current, state.focusedPart);
    move.current = false;
  }, [state]);

  const reset = useRef(onReset);
  reset.current = onReset;
  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form) return;
    const handler = () => reset.current();
    form.addEventListener("reset", handler);
    return () => form.removeEventListener("reset", handler);
  }, []);

  return useMemo(() => {
    const textProps = (which: "date" | "time"): Record<string, unknown> => {
      const sub =
        which === "date" ? controller.getDate() : controller.getTime();
      const attributes =
        which === "date"
          ? controller.getDateFieldAttributes()
          : controller.getTimeFieldAttributes();
      const {
        disabled: _d,
        readonly: _r,
        ...rest
      } = toReactProps(attributes) as Record<string, unknown>;
      const subState = which === "date" ? state.dateField : state.timeField;
      return {
        ...rest,
        value: subState.text,
        disabled: state.disabled,
        readOnly: state.readOnly,
        onChange: (event: { target: { value: string } }) =>
          sub.setText(event.target.value),
        onBlur: () => {
          sub.commitText();
          onBlurOutside();
        },
        onKeyDown: (event: KeyboardEvent) => {
          if (sub.handleTextKeyDown(event.key)) {
            event.preventDefault();
            event.stopPropagation();
          }
        },
        onPaste: (event: ClipboardEvent) => {
          event.preventDefault();
          controller.paste(event.clipboardData.getData("text"));
        },
      };
    };
    return {
      state,
      controller,
      getRootProps: (): ChronoProps & { ref: RefObject<HTMLElement> } => ({
        ...toReactProps(controller.getRootAttributes()),
        ref: rootRef as RefObject<HTMLElement>,
        onKeyUp: () => {
          move.current = false;
        },
        onBlur: (event: FocusEvent) => {
          const next = event.relatedTarget as Node | null;
          if (!next || !event.currentTarget.contains(next)) onBlurOutside();
        },
      }),
      getSegmentProps: (segment: DateTimeSegmentView): ChronoProps => {
        const attributes = toReactProps(
          controller.getSegmentAttributes(segment),
        );
        if (segment.type === "literal") return attributes;
        const part = segment.type;
        return {
          ...attributes,
          onFocus: () => controller.focusPart(part),
          onBlur: () => controller.settle(),
          onKeyDown: (event: KeyboardEvent) => {
            if (controller.handleKeyDown(part, event.key, modifiersOf(event))) {
              event.preventDefault();
              move.current = true;
            }
          },
          onPaste: (event: ClipboardEvent) => {
            event.preventDefault();
            controller.paste(event.clipboardData.getData("text"));
          },
        };
      },
      getDateFieldProps: () => textProps("date"),
      getTimeFieldProps: () => textProps("time"),
      getClearButtonProps: (): ChronoProps => ({
        ...toReactProps(controller.getClearButtonAttributes()),
        onClick: () => {
          controller.clear();
          move.current = true;
        },
      }),
    };
  }, [controller, state, onBlurOutside]);
}

export type DateTimeInputPropGetters = ReturnType<typeof useDateTimeInput>;

/** Headless date-time input (segmented or two text fields) for React. */
export function useDateTimeInput(options: DateTimeInputOptions = {}) {
  const generatedId = useId();
  const [controller] = useState(() =>
    createDateTimeInputController({
      ...options,
      id: options.id ?? generatedId,
    }),
  );
  useIsomorphicLayoutEffect(() => {
    const { id: _id, ...next } = options;
    controller.setOptions(next);
  });
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState,
  );
  const commit = useMemo(() => () => controller.commit(), [controller]);
  const reset = useMemo(() => () => controller.reset(), [controller]);
  return useField(controller, state, reset, commit);
}

/** Headless date-time range input: two fields in one group. */
export function useDateTimeRangeInput(options: DateTimeRangeInputOptions = {}) {
  const generatedId = useId();
  const [controller] = useState(() =>
    createDateTimeRangeInputController({
      ...options,
      id: options.id ?? generatedId,
    }),
  );
  useIsomorphicLayoutEffect(() => {
    const { id: _id, ...next } = options;
    controller.setOptions(next);
  });
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState,
  );
  const commit = useMemo(() => () => controller.commit(), [controller]);
  const reset = useMemo(() => () => controller.reset(), [controller]);
  const start = useField(controller.getStart(), state.start, reset, commit);
  const end = useField(controller.getEnd(), state.end, reset, commit);
  return useMemo(
    () => ({
      state,
      controller,
      start,
      end,
      getRootProps: (): ChronoProps =>
        toReactProps(controller.getRootAttributes()),
    }),
    [controller, state, start, end],
  );
}
