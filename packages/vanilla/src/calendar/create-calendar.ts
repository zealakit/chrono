import {
  type CalendarController,
  type CalendarOptions,
  type CalendarState,
  createCalendarController,
} from "@zealakit/chrono-core/calendar";
import {
  focusDateCell,
  syncRovingTabIndex,
} from "@zealakit/chrono-core/foundation";
import { actionOf, dateOf } from "./delegate.js";

export type VanillaCalendar = {
  readonly controller: CalendarController;
  getState(): CalendarState;
  subscribe(listener: (state: CalendarState) => void): () => void;
  setOptions(options: Partial<CalendarOptions>): void;
  /** Call after each render: restores the roving `tabindex` and, after a key press, DOM focus. */
  syncFocus(): void;
  destroy(): void;
};

/**
 * Controller-only calendar for plain DOM (02 §6): you render the markup from
 * `state` with any templating and stamp `controller.get*Attributes()` with
 * `applyAttributes`. Listeners are delegated on `root`:
 *
 * - click on `[data-chrono-action="prev|next|today"]`, or `="view"` with `data-view`,
 * - click and keydown on `[data-chrono-key]` (the ISO date of a cell).
 */
export function createCalendar(
  root: HTMLElement,
  options: CalendarOptions = {},
): VanillaCalendar {
  const controller = createCalendarController({ ...options, lazyStart: true });
  let keyboardMove = false;

  const onClick = (event: Event): void => {
    const action = actionOf(event.target, root);
    if (action) {
      if (action.action === "view")
        controller.setView(action.element.getAttribute("data-view") ?? "");
      else if (
        action.action === "prev" ||
        action.action === "next" ||
        action.action === "today"
      ) {
        controller[action.action]();
      }
      return;
    }
    const hit = dateOf(event.target, root);
    if (hit) controller.activateDate(hit.date, "pointer");
  };
  const onKeydown = (event: Event): void => {
    const hit = dateOf(event.target, root);
    if (!hit) return;
    const key = event as KeyboardEvent;
    // The key press starts from the cell it happened on, however that cell got focus.
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
  controller.start();

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
