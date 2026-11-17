import type {
  TimePanelColumnState,
  TimePanelController,
  TimePanelGroupState,
  TimePanelOptionState,
  TimePanelSetState,
} from "@zealakit/chrono-core/time";
import {
  focusDateCell,
  scrollOptionIntoView,
} from "@zealakit/chrono-core/foundation";
import {
  type MaybeRefOrGetter,
  nextTick,
  onMounted,
  onScopeDispose,
  ref,
  shallowRef,
  toValue,
  watch,
} from "vue";
import { modifiersOf, toVueProps } from "../shared/to-vue-props.js";

type Props = Record<string, unknown>;

const optionElement = (root: Element, key: string): Element | null =>
  root.querySelector(`[data-chrono-key="${key.replace(/["\\]/g, "\\$&")}"]`);

// biome-ignore lint/suspicious/noExplicitAny: both panels share one binding
export function bindPanel(
  controller: TimePanelController<any, any>,
  options: MaybeRefOrGetter<object> | null,
) {
  const state = shallowRef(controller.getState());
  const rootRef = ref<HTMLElement | null>(null);
  const tracked =
    <A extends unknown[], R>(fn: (...args: A) => R) =>
    (...args: A): R => {
      void state.value;
      return fn(...args);
    };
  let keyboardMove = false;

  const stop = controller.subscribe((next) => {
    state.value = next;
  });
  if (options !== null) {
    watch(
      () => ({ ...toValue(options) }),
      ({ id: _id, ...next }: Props) => controller.setOptions(next),
    );
  }
  watch(state, async (next) => {
    if (!keyboardMove) return;
    await nextTick();
    if (rootRef.value) {
      focusDateCell(rootRef.value, next.focusKey);
      scrollOptionIntoView(optionElement(rootRef.value, next.focusKey));
    }
    keyboardMove = false;
  });
  // Keep the selected options visible when the value changes (T15).
  const selectedOf = (): string =>
    [
      ...state.value.sets.flatMap((set) =>
        set.columns.flatMap((column) => column.options),
      ),
      ...state.value.groups.flatMap((group) => group.options),
    ]
      .filter((option) => option.selected)
      .map((option) => option.key)
      .join("|");
  watch(selectedOf, async (keys) => {
    if (!state.value.scrollToSelected || !keys) return;
    await nextTick();
    for (const key of keys.split("|")) {
      if (rootRef.value)
        scrollOptionIntoView(optionElement(rootRef.value, key));
    }
  });
  // autoFocus is opt-in and runs after mount, never during setup or SSR.
  onMounted(() => {
    const first = controller.getState();
    if (first.autoFocus && rootRef.value)
      focusDateCell(rootRef.value, first.focusKey);
  });
  onScopeDispose(() => {
    stop();
    if (options !== null) controller.destroy();
  });

  return {
    state,
    controller,
    rootRef,
    actions: { clear: controller.clear, commit: controller.commit },
    getRootProps: tracked(
      (): Props => ({
        ...toVueProps(controller.getRootAttributes()),
        onKeyup: () => {
          keyboardMove = false;
        },
        onMouseleave: () => {
          if (state.value.draft) controller.setPreview(null);
        },
      }),
    ),
    getSetProps: tracked(
      (set: TimePanelSetState): Props =>
        toVueProps(controller.getSetAttributes(set)),
    ),
    getColumnProps: tracked(
      (column: TimePanelColumnState): Props =>
        toVueProps(controller.getColumnAttributes(column)),
    ),
    getGroupProps: tracked(
      (group: TimePanelGroupState): Props =>
        toVueProps(controller.getGroupAttributes(group)),
    ),
    getListProps: tracked(
      (): Props => toVueProps(controller.getListAttributes()),
    ),
    getOptionProps: tracked(
      (option: TimePanelOptionState): Props => ({
        ...toVueProps(controller.getOptionAttributes(option)),
        onClick: () => controller.pick(option.key, "pointer"),
        onMouseenter: () => {
          if (state.value.draft) controller.setPreview(option.key);
        },
        onKeydown: (event: KeyboardEvent) => {
          controller.focusOption(option.key);
          if (controller.handleKeyDown(event.key, modifiersOf(event))) {
            event.preventDefault();
            if (event.key === "Escape") event.stopPropagation();
            keyboardMove = true;
          }
        },
      }),
    ),
  };
}
