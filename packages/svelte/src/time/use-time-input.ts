import {
  type TimeInputController,
  type TimeInputOptions,
  type TimeInputState,
  type TimeRangeInputOptions,
  type TimeRangeInputState,
  type TimeSegmentView,
  createTimeInputController,
  createTimeRangeInputController,
} from "@zealakit/chrono-core/time";
import { focusPart } from "@zealakit/chrono-core/foundation";
import { tick } from "svelte";
import { type Props, modifiersOf, toProps } from "../shared/props.js";
import type { Readable } from "../shared/readable.js";

/** Getters for one date field (a single input, or one end of a range). */
function bindField(
  controller: TimeInputController,
  onBlurOutside: () => void,
  onReset: () => void,
) {
  const state: Readable<TimeInputState> = {
    subscribe(run) {
      run(controller.getState());
      return controller.subscribe(run);
    },
  };
  let root: HTMLElement | null = null;
  let move = false;
  let formCleanup: (() => void) | undefined;

  controller.subscribe(async (next) => {
    if (!move) return;
    await tick();
    if (root) focusPart(root, next.focusedPart);
    move = false;
  });

  return {
    state,
    controller,
    /** Called from an effect: remembers the root and listens for form reset. */
    setRoot(element: HTMLElement | null) {
      formCleanup?.();
      formCleanup = undefined;
      root = element;
      const form = element?.closest("form");
      if (form) {
        form.addEventListener("reset", onReset);
        formCleanup = () => form.removeEventListener("reset", onReset);
      }
    },
    getRootProps: (): Props => ({
      ...toProps(controller.getRootAttributes()),
      onkeyup: () => {
        move = false;
      },
      onfocusout: (event: FocusEvent) => {
        const next = event.relatedTarget as Node | null;
        if (!next || !(event.currentTarget as Node).contains(next)) {
          onBlurOutside();
        }
      },
    }),
    getSegmentProps: (segment: TimeSegmentView): Props => {
      const attributes = toProps(controller.getSegmentAttributes(segment));
      if (segment.type === "literal") return attributes;
      const part = segment.type;
      return {
        ...attributes,
        onfocus: () => controller.focusPart(part),
        onblur: () => controller.settle(),
        onkeydown: (event: KeyboardEvent) => {
          move = true;
          if (controller.handleKeyDown(part, event.key, modifiersOf(event))) {
            event.preventDefault();
          } else {
            move = false;
          }
        },
        onpaste: (event: ClipboardEvent) => {
          event.preventDefault();
          controller.paste(event.clipboardData?.getData("text") ?? "");
        },
      };
    },
    getTextFieldProps: (): Props => {
      const {
        disabled: _d,
        readonly: _r,
        ...attributes
      } = toProps(controller.getTextFieldAttributes());
      const current = controller.getState();
      return {
        ...attributes,
        value: current.text,
        disabled: current.disabled || undefined,
        readonly: current.readOnly || undefined,
        oninput: (event: Event) =>
          controller.setText((event.target as HTMLInputElement).value),
        onblur: () => {
          controller.commitText();
          onBlurOutside();
        },
        onkeydown: (event: KeyboardEvent) => {
          if (controller.handleTextKeyDown(event.key)) {
            event.preventDefault();
            event.stopPropagation();
          }
        },
        onpaste: (event: ClipboardEvent) => {
          event.preventDefault();
          controller.setText(event.clipboardData?.getData("text") ?? "");
          controller.commitText();
        },
      };
    },
    getClearButtonProps: (): Props => ({
      ...toProps(controller.getClearButtonAttributes()),
      onclick: () => {
        move = true;
        controller.clear();
      },
    }),
  };
}

export type TimeFieldApi = ReturnType<typeof bindField>;

/** Headless date input (segmented or text) for Svelte. */
export function useTimeInput(options: TimeInputOptions = {}): TimeFieldApi {
  const controller = createTimeInputController(options);
  return bindField(
    controller,
    () => controller.commit(),
    () => controller.reset(),
  );
}

/** Headless date range input: two fields in one group. */
export function useTimeRangeInput(options: TimeRangeInputOptions = {}) {
  const controller = createTimeRangeInputController(options);
  const state: Readable<TimeRangeInputState> = {
    subscribe(run) {
      run(controller.getState());
      return controller.subscribe(run);
    },
  };
  const commit = () => controller.commit();
  const reset = () => controller.reset();
  return {
    state,
    controller,
    start: bindField(controller.getStart(), commit, reset),
    end: bindField(controller.getEnd(), commit, reset),
    getRootProps: (): Props => toProps(controller.getRootAttributes()),
  };
}

export type TimeRangeInputApi = ReturnType<typeof useTimeRangeInput>;
