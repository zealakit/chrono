import type {
  TimePanelController,
  TimePanelState,
} from "@zealakit/chrono-core/time";
import {
  focusDateCell,
  scrollOptionIntoView,
  syncRovingTabIndex,
} from "@zealakit/chrono-core/foundation";

export type VanillaTimePanel<O> = {
  readonly controller: TimePanelController<unknown, O>;
  getState(): TimePanelState;
  subscribe(listener: (state: TimePanelState) => void): () => void;
  setOptions(options: Partial<O>): void;
  /** Call after each render: restores the roving `tabindex` and, after a key press, DOM focus and scroll. */
  syncFocus(): void;
  destroy(): void;
};

const keyOf = (target: EventTarget | null, root: Element): string | null => {
  const element = (target as Element | null)?.closest?.(
    '[role="option"][data-chrono-key]',
  );
  return element && root.contains(element)
    ? element.getAttribute("data-chrono-key")
    : null;
};

export function bindPanel<O>(
  root: HTMLElement,
  // biome-ignore lint/suspicious/noExplicitAny: the panels share one binding
  controller: TimePanelController<any, any>,
  owns = true,
): VanillaTimePanel<O> {
  let keyboardMove = false;
  const optionElement = (key: string): Element | null =>
    root.querySelector(`[data-chrono-key="${key.replace(/["\\]/g, "\\$&")}"]`);

  const onClick = (event: Event): void => {
    const key = keyOf(event.target, root);
    if (key) controller.pick(key, "pointer");
  };
  const onKeydown = (event: Event): void => {
    const key = keyOf(event.target, root);
    if (!key) return;
    const press = event as KeyboardEvent;
    controller.focusOption(key);
    keyboardMove = true;
    if (
      controller.handleKeyDown(press.key, {
        shift: press.shiftKey,
        ctrl: press.ctrlKey,
        meta: press.metaKey,
      })
    ) {
      press.preventDefault();
      // Escape is stopped only when it cancelled something.
      if (press.key === "Escape") press.stopPropagation();
    } else {
      keyboardMove = false;
    }
  };
  const onKeyup = (): void => {
    keyboardMove = false;
  };
  const onMouseOver = (event: Event): void => {
    if (!controller.getState().draft) return;
    const key = keyOf(event.target, root);
    if (key) controller.setPreview(key);
  };
  const onMouseLeave = (): void => {
    if (controller.getState().draft) controller.setPreview(null);
  };
  root.addEventListener("click", onClick);
  root.addEventListener("keydown", onKeydown);
  root.addEventListener("keyup", onKeyup);
  root.addEventListener("mouseover", onMouseOver);
  root.addEventListener("mouseleave", onMouseLeave);

  return {
    controller,
    getState: controller.getState,
    subscribe: controller.subscribe,
    setOptions: controller.setOptions,
    syncFocus() {
      const { focusKey } = controller.getState();
      syncRovingTabIndex(root, focusKey);
      if (keyboardMove) {
        focusDateCell(root, focusKey);
        scrollOptionIntoView(optionElement(focusKey));
        keyboardMove = false;
      }
    },
    destroy() {
      root.removeEventListener("click", onClick);
      root.removeEventListener("keydown", onKeydown);
      root.removeEventListener("keyup", onKeyup);
      root.removeEventListener("mouseover", onMouseOver);
      root.removeEventListener("mouseleave", onMouseLeave);
      if (owns) controller.destroy();
    },
  };
}
