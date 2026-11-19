import {
  type MiniCalendarController,
  type MiniCalendarOptions,
  type MiniCalendarState,
  createMiniCalendarController,
} from "@zealakit/chrono-core/calendar";
import {
  focusDateCell,
  syncRovingTabIndex,
} from "@zealakit/chrono-core/foundation";
import { actionOf, dateOf } from "./delegate.js";

export type VanillaMiniCalendar = {
  readonly controller: MiniCalendarController;
  getState(): MiniCalendarState;
  subscribe(listener: (state: MiniCalendarState) => void): () => void;
  setOptions(options: Partial<MiniCalendarOptions>): void;
  syncFocus(): void;
  destroy(): void;
};

/**
 * Controller-only Mini Calendar for plain DOM. Delegated listeners on `root`:
 * click on `[data-chrono-action="prev|next"]`, click and keydown on `[data-chrono-key]`.
 */
export function createMiniCalendar(
  root: HTMLElement,
  options: MiniCalendarOptions = {},
): VanillaMiniCalendar {
  const controller = createMiniCalendarController(options);
  let keyboardMove = false;

  const onClick = (event: Event): void => {
    const action = actionOf(event.target, root);
    if (action) {
      if (action.action === "prev" || action.action === "next")
        controller[action.action]();
      return;
    }
    const hit = dateOf(event.target, root);
    if (hit) controller.activateDate(hit.date, "pointer");
  };
  const onKeydown = (event: Event): void => {
    const hit = dateOf(event.target, root);
    if (!hit) return;
    const key = event as KeyboardEvent;
    controller.focusDate(hit.date);
    keyboardMove = true;
    if (
      controller.handleKeyDown(key.key, {
        shift: key.shiftKey,
        ctrl: key.ctrlKey,
        meta: key.metaKey,
      })
    ) {
      key.preventDefault();
    } else {
      keyboardMove = false;
    }
  };
  const onKeyup = (): void => {
    keyboardMove = false;
  };

  root.addEventListener("click", onClick);
  root.addEventListener("keydown", onKeydown);
  root.addEventListener("keyup", onKeyup);

  return {
    controller,
    getState: controller.getState,
    subscribe: controller.subscribe,
    setOptions: controller.setOptions,
    syncFocus() {
      const { focusedDate } = controller.getState();
      syncRovingTabIndex(root, focusedDate);
      if (keyboardMove) {
        focusDateCell(root, focusedDate);
        keyboardMove = false;
      }
    },
    destroy() {
      root.removeEventListener("click", onClick);
      root.removeEventListener("keydown", onKeydown);
      root.removeEventListener("keyup", onKeyup);
      controller.destroy();
    },
  };
}
