import {
  type TimeInputController,
  type TimeInputOptions,
  type TimeInputState,
  type TimeRangeInputOptions,
  type TimeSegmentView,
  createTimeInputController,
  createTimeRangeInputController,
} from "@zealakit/chrono-core/time";
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

/** Getters for one date field (a single input, or one end of a range). */
function bindField(
  controller: TimeInputController,
  state: ShallowRef<TimeInputState>,
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
          if (!next || !(event.currentTarget as Node).contains(next)) {
            onBlurOutside();
          }
        },
      }),
    ),
    getSegmentProps: tracked((segment: TimeSegmentView): Props => {
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
    getTextFieldProps: tracked((): Props => {
      const {
        disabled: _d,
        readonly: _r,
        ...attributes
      } = toVueProps(controller.getTextFieldAttributes());
      return {
        ...attributes,
        value: state.value.text,
        disabled: state.value.disabled || undefined,
        readonly: state.value.readOnly || undefined,
        onInput: (event: Event) =>
          controller.setText((event.target as HTMLInputElement).value),
        onBlur: () => {
          controller.commitText();
          onBlurOutside();
        },
        onKeydown: (event: KeyboardEvent) => {
          if (controller.handleTextKeyDown(event.key)) {
            event.preventDefault();
            event.stopPropagation();
          }
        },
        onPaste: (event: ClipboardEvent) => {
          event.preventDefault();
          controller.setText(event.clipboardData?.getData("text") ?? "");
          controller.commitText();
        },
      };
    }),
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

export type TimeFieldComposable = ReturnType<typeof bindField>;

/** Headless date input (segmented or text) for Vue. */
export function useTimeInput(
  options: MaybeRefOrGetter<TimeInputOptions> = {},
): TimeFieldComposable {
  const initial = toValue(options);
  const controller = createTimeInputController({
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

/** Headless date range input: two fields in one group. */
export function useTimeRangeInput(
  options: MaybeRefOrGetter<TimeRangeInputOptions> = {},
) {
  const initial = toValue(options);
  const controller = createTimeRangeInputController({
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
  const rootRef = ref<HTMLElement | null>(null);
  return {
    state,
    controller,
    rootRef,
    start,
    end,
    getRootProps: (): Props => {
      void state.value;
      return toVueProps(controller.getRootAttributes());
    },
  };
}

export type TimeRangeInputComposable = ReturnType<typeof useTimeRangeInput>;
