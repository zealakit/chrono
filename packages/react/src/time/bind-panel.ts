"use client";

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
  type KeyboardEvent,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { modifiersOf } from "../shared/modifiers.js";
import { type ChronoProps, toReactProps } from "../shared/to-react-props.js";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

const optionElement = (root: Element, key: string): Element | null =>
  root.querySelector(`[data-chrono-key="${key.replace(/["\\]/g, "\\$&")}"]`);

// biome-ignore lint/suspicious/noExplicitAny: both panels share one binding
export function useBoundPanel(
  controller: TimePanelController<any, any>,
  options: object | null,
) {
  const rootRef = useRef<HTMLElement | null>(null);
  const keyboardMove = useRef(false);

  useIsomorphicLayoutEffect(() => {
    if (options === null) return; // a composite controller pushes its own options
    const { id: _id, ...next } = options as { id?: string };
    controller.setOptions(next);
  });
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState,
  );

  // autoFocus is opt-in and runs after mount, never during render or SSR.
  useEffect(() => {
    const first = controller.getState();
    if (first.autoFocus && rootRef.current) {
      focusDateCell(rootRef.current, first.focusKey);
    }
  }, [controller]);

  useIsomorphicLayoutEffect(() => {
    if (!keyboardMove.current || !rootRef.current) return;
    focusDateCell(rootRef.current, state.focusKey);
    scrollOptionIntoView(optionElement(rootRef.current, state.focusKey));
    keyboardMove.current = false;
  }, [state]);

  // Keep the selected options visible when the value changes (T15).
  const selected = useMemo(() => {
    const keys: string[] = [];
    for (const set of state.sets) {
      for (const column of set.columns) {
        for (const option of column.options)
          if (option.selected) keys.push(option.key);
      }
    }
    for (const group of state.groups) {
      for (const option of group.options)
        if (option.selected) keys.push(option.key);
    }
    return keys.join("|");
  }, [state.sets, state.groups]);
  useEffect(() => {
    if (!state.scrollToSelected || !rootRef.current || !selected) return;
    for (const key of selected.split("|")) {
      scrollOptionIntoView(optionElement(rootRef.current, key));
    }
  }, [selected, state.scrollToSelected]);

  return useMemo(
    () => ({
      state,
      controller,
      actions: { clear: controller.clear, commit: controller.commit },
      getRootProps: (): ChronoProps & { ref: RefObject<HTMLElement> } => ({
        ...toReactProps(controller.getRootAttributes()),
        ref: rootRef as RefObject<HTMLElement>,
        onKeyUp: () => {
          keyboardMove.current = false;
        },
        onMouseLeave: () => {
          if (state.draft) controller.setPreview(null);
        },
      }),
      getSetProps: (set: TimePanelSetState): ChronoProps =>
        toReactProps(controller.getSetAttributes(set)),
      getColumnProps: (column: TimePanelColumnState): ChronoProps =>
        toReactProps(controller.getColumnAttributes(column)),
      getGroupProps: (group: TimePanelGroupState): ChronoProps =>
        toReactProps(controller.getGroupAttributes(group)),
      getListProps: (): ChronoProps =>
        toReactProps(controller.getListAttributes()),
      getOptionProps: (option: TimePanelOptionState): ChronoProps => ({
        ...toReactProps(controller.getOptionAttributes(option)),
        onClick: () => controller.pick(option.key, "pointer"),
        onMouseEnter: () => {
          if (state.draft) controller.setPreview(option.key);
        },
        onKeyDown: (event: KeyboardEvent) => {
          // The key press starts from the option it happened on.
          controller.focusOption(option.key);
          if (controller.handleKeyDown(event.key, modifiersOf(event))) {
            event.preventDefault();
            // Escape is stopped only when it cancelled something.
            if (event.key === "Escape") event.stopPropagation();
            keyboardMove.current = true;
          }
        },
      }),
    }),
    [controller, state],
  );
}
