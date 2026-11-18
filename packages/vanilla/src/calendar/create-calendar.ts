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
import { actionOf, dateOf, eventKeyOf, moreOf } from "./delegate.js";

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
 * - click on a group row header (`[role=rowheader][data-resource-group]`) toggles it (plan 10),
 * - click on `[data-overflow]` ("+N more") → `onMoreActivate`,
 * - click on `[data-chrono-event-key]` → `onSelectedEventChange`,
 * - double-click on `[data-chrono-event-key]` → `onEventActivate`,
 * - click and keydown on `[data-chrono-key]` (a day or slot key).
 */
export function createCalendar(
  root: HTMLElement,
  options: CalendarOptions = {},
): VanillaCalendar {
  const controller = createCalendarController({ ...options, lazyStart: true });
  let keyboardMove = false;

  const onClick = (event: Event): void => {
    const group = (event.target as Element | null)?.closest?.(
      "[role=rowheader][data-resource-group][data-resource-id]",
    );
    if (group && root.contains(group)) {
      controller.toggleResource(group.getAttribute("data-resource-id") ?? "");
      return;
    }
    const more = moreOf(event.target, root);
    if (more) {
      controller.activateMore(more.dayKey);
      return;
    }
    const eventHit = eventKeyOf(event.target, root);
    if (eventHit) {
      const segment = controller.getEventSegment(eventHit.key);
      if (segment) {
        controller.selectEvent(segment.event.id);
        return;
      }
    }
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
  const onDblClick = (event: Event): void => {
    const eventHit = eventKeyOf(event.target, root);
    if (!eventHit) return;
    const segment = controller.getEventSegment(eventHit.key);
    if (segment) controller.activateEvent(segment.key, "pointer");
  };
  const onKeydown = (event: Event): void => {
    const hit = dateOf(event.target, root);
    if (!hit) return;
    const key = event as KeyboardEvent;
    // The key press starts from the cell it happened on, however that cell got focus.
    // A key pressed on an event (move/resize editing, plan 09) keeps the focus state as it is.
    if (!eventKeyOf(event.target, root)) controller.focusDate(hit.date);
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
  root.addEventListener("dblclick", onDblClick);
  root.addEventListener("keydown", onKeydown);
  root.addEventListener("keyup", onKeyup);
  controller.start();
  controller.mount(root);

  return {
    controller,
    getState: controller.getState,
    subscribe: controller.subscribe,
    setOptions: controller.setOptions,
    syncFocus() {
      const { focus } = controller.getState();
      const key = focus.cellKey;
      syncRovingTabIndex(root, key);
      if (keyboardMove) {
        focusDateCell(root, key);
        keyboardMove = false;
      }
    },
    destroy() {
      root.removeEventListener("click", onClick);
      root.removeEventListener("dblclick", onDblClick);
      root.removeEventListener("keydown", onKeydown);
      root.removeEventListener("keyup", onKeyup);
      controller.unmount();
      controller.destroy();
    },
  };
}
