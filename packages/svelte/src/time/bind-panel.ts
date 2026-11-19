import type {
  TimePanelColumnState,
  TimePanelController,
  TimePanelGroupState,
  TimePanelOptionState,
  TimePanelSetState,
  TimePanelState,
} from "@zealakit/chrono-core/time";
import {
  focusDateCell,
  scrollOptionIntoView,
} from "@zealakit/chrono-core/foundation";
import { tick } from "svelte";
import { type Props, modifiersOf, toProps } from "../shared/props.js";
import type { Readable } from "../shared/readable.js";

const optionElement = (root: Element, key: string): Element | null =>
  root.querySelector(`[data-chrono-key="${key.replace(/["\\]/g, "\\$&")}"]`);

const selectedKeys = (state: TimePanelState): string =>
  [
    ...state.sets.flatMap((set) =>
      set.columns.flatMap((column) => column.options),
    ),
    ...state.groups.flatMap((group) => group.options),
  ]
    .filter((option) => option.selected)
    .map((option) => option.key)
    .join("|");

// biome-ignore lint/suspicious/noExplicitAny: the panels share one binding
export function bindPanel(controller: TimePanelController<any, any>) {
  const state: Readable<TimePanelState> = {
    subscribe(run) {
      run(controller.getState());
      return controller.subscribe(run);
    },
  };
  let root: HTMLElement | null = null;
  let keyboardMove = false;
  let focusedOnMount = false;
  let lastSelected = selectedKeys(controller.getState());

  controller.subscribe(async (next) => {
    const selected = selectedKeys(next);
    const changed = selected !== lastSelected;
    lastSelected = selected;
    if (!keyboardMove && !changed) return;
    await tick();
    if (!root) return;
    if (keyboardMove) {
      focusDateCell(root, next.focusKey);
      scrollOptionIntoView(optionElement(root, next.focusKey));
      keyboardMove = false;
    }
    if (changed && next.scrollToSelected) {
      for (const key of selected.split("|")) {
        if (key) scrollOptionIntoView(optionElement(root, key));
      }
    }
  });

  return {
    state,
    controller,
    /** Called from an effect after mount; `autoFocus` is opt-in. */
    setRoot(element: HTMLElement | null) {
      root = element;
      if (element && !focusedOnMount) {
        focusedOnMount = true;
        const first = controller.getState();
        if (first.autoFocus) focusDateCell(element, first.focusKey);
      }
    },
    actions: { clear: controller.clear, commit: controller.commit },
    getRootProps: (): Props => ({
      ...toProps(controller.getRootAttributes()),
      onkeyup: () => {
        keyboardMove = false;
      },
      onmouseleave: () => {
        if (controller.getState().draft) controller.setPreview(null);
      },
    }),
    getSetProps: (set: TimePanelSetState): Props =>
      toProps(controller.getSetAttributes(set)),
    getColumnProps: (column: TimePanelColumnState): Props =>
      toProps(controller.getColumnAttributes(column)),
    getGroupProps: (group: TimePanelGroupState): Props =>
      toProps(controller.getGroupAttributes(group)),
    getListProps: (): Props => toProps(controller.getListAttributes()),
    getOptionProps: (option: TimePanelOptionState): Props => ({
      ...toProps(controller.getOptionAttributes(option)),
      onclick: () => controller.pick(option.key, "pointer"),
      onmouseenter: () => {
        if (controller.getState().draft) controller.setPreview(option.key);
      },
      onkeydown: (event: KeyboardEvent) => {
        controller.focusOption(option.key);
        keyboardMove = true;
        if (controller.handleKeyDown(event.key, modifiersOf(event))) {
          event.preventDefault();
          if (event.key === "Escape") event.stopPropagation();
        } else {
          keyboardMove = false;
        }
      },
    }),
  };
}
