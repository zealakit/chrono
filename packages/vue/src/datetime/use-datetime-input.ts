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
  type MaybeRefOrGetter,
  type ShallowRef,
  getCurrentInstance,
  nextTick,
  onMounted,
  onScopeDispose,
  ref,
  shallowRef,
  toValue,
  useId,
  watch,
} from "vue";
import { modifiersOf, toVueProps } from "../shared/to-vue-props.js";

type Props = Record<string, unknown>;

/** Getters for one date-time field (a single input, or one end of a range). */
function bindField(
  controller: DateTimeInputController,
  state: ShallowRef<DateTimeInputState>,
  onReset: () => void,
  onBlurOutside: () => void,
) {
  const rootRef = ref<HTMLElement | null>(null);
  let move = false;
  const tracked =
    <A extends unknown[], R>(fn: (...args: A) => R) =>
    (...args: A): R => {
      void state.value;
      return fn(...args);
    };
  watch(state, async (next) => {
    if (!move) return;
    await nextTick();
    if (rootRef.value) focusPart(rootRef.value, next.focusedPart);
    move = false;
  });
  onMounted(() => {
    const form = rootRef.value?.closest("form");
    if (!form) return;
    form.addEventListener("reset", onReset);
    onScopeDispose(() => form.removeEventListener("reset", onReset));
  });

  const textProps = (which: "date" | "time"): Props => {
    const sub = which === "date" ? controller.getDate() : controller.getTime();
    const attributes =
      which === "date"
        ? controller.getDateFieldAttributes()
        : controller.getTimeFieldAttributes();
    const { disabled: _d, readonly: _r, ...rest } = toVueProps(attributes);
    const subState =
      which === "date" ? state.value.dateField : state.value.timeField;
    return {
      ...rest,
      value: subState.text,
      disabled: state.value.disabled || undefined,
      readonly: state.value.readOnly || undefined,
      onInput: (event: Event) =>
        sub.setText((event.target as HTMLInputElement).value),
      onBlur: () => {
        sub.commitText();
        onBlurOutside();
      },
      onKeydown: (event: KeyboardEvent) => {
        if (sub.handleTextKeyDown(event.key)) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      onPaste: (event: ClipboardEvent) => {
        event.preventDefault();
        controller.paste(event.clipboardData?.getData("text") ?? "");
      },
    };
  };

  return {
    state,
    controller,
    rootRef,
    getRootProps: tracked(
      (): Props => ({
        ...toVueProps(controller.getRootAttributes()),
        onKeyup: () => {
          move = false;
        },
        onFocusout: (event: FocusEvent) => {
          const next = event.relatedTarget as Node | null;
          if (!next || !(event.currentTarget as Node).contains(next))
            onBlurOutside();
        },
      }),
    ),
    getSegmentProps: tracked((segment: DateTimeSegmentView): Props => {
      const attributes = toVueProps(controller.getSegmentAttributes(segment));
      if (segment.type === "literal") return attributes;
      const part = segment.type;
      return {
        ...attributes,
        onFocus: () => controller.focusPart(part),
        onBlur: () => controller.settle(),
        onKeydown: (event: KeyboardEvent) => {
          if (controller.handleKeyDown(part, event.key, modifiersOf(event))) {
            event.preventDefault();
            move = true;
          }
        },
        onPaste: (event: ClipboardEvent) => {
          event.preventDefault();
          controller.paste(event.clipboardData?.getData("text") ?? "");
        },
      };
    }),
    getDateFieldProps: tracked((): Props => textProps("date")),
    getTimeFieldProps: tracked((): Props => textProps("time")),
    getClearButtonProps: tracked(
      (): Props => ({
        ...toVueProps(controller.getClearButtonAttributes()),
        onClick: () => {
          controller.clear();
          move = true;
        },
      }),
    ),
  };
}

const idOf = (options: { id?: string }): string | undefined =>
  options.id ?? (getCurrentInstance() ? useId() : undefined);

export type DateTimeFieldComposable = ReturnType<typeof bindField>;

/** Headless date-time input (segmented or two text fields) for Vue. */
export function useDateTimeInput(
  options: MaybeRefOrGetter<DateTimeInputOptions> = {},
): DateTimeFieldComposable {
  const initial = toValue(options);
  const controller = createDateTimeInputController({
    ...initial,
    id: idOf(initial),
  });
  const state = shallowRef(controller.getState());
  const stop = controller.subscribe((next) => {
    state.value = next;
  });
  watch(
    () => ({ ...toValue(options) }),
    ({ id: _id, ...next }) => controller.setOptions(next),
  );
  onScopeDispose(() => {
    stop();
    controller.destroy();
  });
  return bindField(
    controller,
    state,
    () => controller.reset(),
    () => controller.commit(),
  );
}

/** Headless date-time range input: two fields in one group. */
export function useDateTimeRangeInput(
  options: MaybeRefOrGetter<DateTimeRangeInputOptions> = {},
) {
  const initial = toValue(options);
  const controller = createDateTimeRangeInputController({
    ...initial,
    id: idOf(initial),
  });
  const state = shallowRef(controller.getState());
  const startState = shallowRef(state.value.start);
  const endState = shallowRef(state.value.end);
  const stop = controller.subscribe((next) => {
    state.value = next;
    startState.value = next.start;
    endState.value = next.end;
  });
  watch(
    () => ({ ...toValue(options) }),
    ({ id: _id, ...next }) => controller.setOptions(next),
  );
  onScopeDispose(() => {
    stop();
    controller.destroy();
  });
  const reset = () => controller.reset();
  const commit = () => controller.commit();
  const start = bindField(controller.getStart(), startState, reset, commit);
  const end = bindField(controller.getEnd(), endState, reset, commit);
  return {
    state,
    controller,
    start,
    end,
    getRootProps: (): Props => {
      void state.value;
      return toVueProps(controller.getRootAttributes());
    },
  };
}

export type DateTimeRangeInputComposable = ReturnType<
  typeof useDateTimeRangeInput
>;
