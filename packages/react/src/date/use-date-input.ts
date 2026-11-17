"use client";

import {
  type DateInputController,
  type DateInputOptions,
  type DateInputState,
  type DateRangeInputOptions,
  type SegmentView,
  createDateInputController,
  createDateRangeInputController,
} from "@zealakit/chrono-core/date";
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

/** Prop getters for one date field (a single input, or one end of a range). */
function useField(
  controller: DateInputController,
  state: DateInputState,
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

  return useMemo(
    () => ({
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
      getSegmentProps: (segment: SegmentView): ChronoProps => {
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
      getTextFieldProps: (): Record<string, unknown> => {
        const {
          disabled: _d,
          readonly: _r,
          ...attributes
        } = toReactProps(controller.getTextFieldAttributes()) as Record<
          string,
          unknown
        >;
        return {
          ...attributes,
          value: state.text,
          disabled: state.disabled,
          readOnly: state.readOnly,
          onChange: (event: { target: { value: string } }) =>
            controller.setText(event.target.value),
          onBlur: () => {
            controller.commitText();
            onBlurOutside();
          },
          onKeyDown: (event: KeyboardEvent) => {
            if (controller.handleTextKeyDown(event.key)) {
              event.preventDefault();
              event.stopPropagation();
            }
          },
          onPaste: (event: ClipboardEvent) => {
            event.preventDefault();
            controller.setText(event.clipboardData.getData("text"));
            controller.commitText();
          },
        };
      },
      getClearButtonProps: (): ChronoProps => ({
        ...toReactProps(controller.getClearButtonAttributes()),
        onClick: () => {
          controller.clear();
          move.current = true;
        },
      }),
    }),
    [controller, state, onBlurOutside],
  );
}

export type DateInputPropGetters = ReturnType<typeof useDateInput>;

/** Headless date input (segmented or text) for React. */
export function useDateInput(options: DateInputOptions = {}) {
  const generatedId = useId();
  const [controller] = useState(() =>
    createDateInputController({ ...options, id: options.id ?? generatedId }),
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

/** Headless date range input: two fields in one group. */
export function useDateRangeInput(options: DateRangeInputOptions = {}) {
  const generatedId = useId();
  const [controller] = useState(() =>
    createDateRangeInputController({
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
  const rootRef = useRef<HTMLElement | null>(null);
  return useMemo(
    () => ({
      state,
      controller,
      start,
      end,
      getRootProps: (): ChronoProps & { ref: RefObject<HTMLElement> } => ({
        ...toReactProps(controller.getRootAttributes()),
        ref: rootRef as RefObject<HTMLElement>,
      }),
    }),
    [controller, state, start, end],
  );
}
