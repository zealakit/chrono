import {
  type DateTimeInputController,
  type DateTimeInputOptions,
  type DateTimeInputState,
  type DateTimeRangeInputOptions,
  type DateTimeRangeInputState,
  type DateTimeSegmentView,
  createDateTimeInputController,
  createDateTimeRangeInputController,
} from "@zealakit/chrono-core/datetime";
import { focusPart } from "@zealakit/chrono-core/foundation";
import { tick } from "svelte";
import { type Props, modifiersOf, toProps } from "../shared/props.js";
import type { Readable } from "../shared/readable.js";

/** Getters for one date-time field (a single input, or one end of a range). */
function bindField(
  controller: DateTimeInputController,
  onBlurOutside: () => void,
  onReset: () => void,
) {
  const state: Readable<DateTimeInputState> = {
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

  const textProps = (which: "date" | "time"): Props => {
    const sub = which === "date" ? controller.getDate() : controller.getTime();
    const attributes =
      which === "date"
        ? controller.getDateFieldAttributes()
        : controller.getTimeFieldAttributes();
    const { disabled: _d, readonly: _r, ...rest } = toProps(attributes);
    const current = controller.getState();
    const subState = which === "date" ? current.dateField : current.timeField;
    return {
      ...rest,
      value: subState.text,
      disabled: current.disabled || undefined,
      readonly: current.readOnly || undefined,
      oninput: (event: Event) =>
        sub.setText((event.target as HTMLInputElement).value),
      onblur: () => {
        sub.commitText();
        onBlurOutside();
      },
      onkeydown: (event: KeyboardEvent) => {
        if (sub.handleTextKeyDown(event.key)) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      onpaste: (event: ClipboardEvent) => {
        event.preventDefault();
        controller.paste(event.clipboardData?.getData("text") ?? "");
      },
    };
  };

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
        if (!next || !(event.currentTarget as Node).contains(next))
          onBlurOutside();
      },
    }),
    getSegmentProps: (segment: DateTimeSegmentView): Props => {
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
    getDateFieldProps: (): Props => textProps("date"),
    getTimeFieldProps: (): Props => textProps("time"),
    getClearButtonProps: (): Props => ({
      ...toProps(controller.getClearButtonAttributes()),
      onclick: () => {
        move = true;
        controller.clear();
      },
    }),
  };
}

export type DateTimeFieldApi = ReturnType<typeof bindField>;

/** Headless date-time input (segmented or two text fields) for Svelte. */
export function useDateTimeInput(
  options: DateTimeInputOptions = {},
): DateTimeFieldApi {
  const controller = createDateTimeInputController(options);
  return bindField(
    controller,
    () => controller.commit(),
    () => controller.reset(),
  );
}

/** Headless date-time range input: two fields in one group. */
export function useDateTimeRangeInput(options: DateTimeRangeInputOptions = {}) {
  const controller = createDateTimeRangeInputController(options);
  const state: Readable<DateTimeRangeInputState> = {
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

export type DateTimeRangeInputApi = ReturnType<typeof useDateTimeRangeInput>;
