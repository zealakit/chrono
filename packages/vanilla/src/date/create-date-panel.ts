import {
  type DatePanelOptions,
  type DateRangePanelOptions,
  type MultiDatePanelOptions,
  type PanelController,
  type PanelState,
  createDatePanelController,
  createDateRangePanelController,
  createMultiDatePanelController,
} from "@zealakit/chrono-core/date";
import {
  type PlainDate,
  focusDateCell,
  plainDate,
  syncRovingTabIndex,
  toIsoString,
} from "@zealakit/chrono-core/foundation";

export type VanillaPanel<S, O> = {
  readonly controller: PanelController<unknown, O>;
  getState(): PanelState;
  subscribe(listener: (state: PanelState) => void): () => void;
  setOptions(options: Partial<O>): void;
  /** Call after each render: restores the roving `tabindex` and, after a key press, DOM focus. */
  syncFocus(): void;
  destroy(): void;
  /** Phantom type: the value this panel holds. */
  readonly __value?: S;
};

/** The date a cell key stands for: `2026-11-17`, `2026-11` or `2026`. */
export function cellDate(key: string): PlainDate | null {
  const [year, month, day] = key.split("-").map(Number);
  if (!year) return null;
  try {
    return plainDate(year, month || 1, day || 1);
  } catch {
    return null;
  }
}

const focusKeyOf = (state: PanelState): string => {
  const { focusedDate, level } = state;
  return level === "day"
    ? toIsoString(focusedDate)
    : level === "month"
      ? `${focusedDate.year}-${String(focusedDate.month).padStart(2, "0")}`
      : String(focusedDate.year);
};

function cellOf(
  target: EventTarget | null,
  root: Element,
): { element: Element; date: PlainDate } | null {
  const element = (target as Element | null)?.closest?.("[data-chrono-key]");
  if (!element || !root.contains(element)) return null;
  const date = cellDate(element.getAttribute("data-chrono-key") ?? "");
  return date ? { element, date } : null;
}

// biome-ignore lint/suspicious/noExplicitAny: the three panels share one binding
function bindPanel<S, O>(
  root: HTMLElement,
  controller: PanelController<any, any>,
): VanillaPanel<S, O> {
  let keyboardMove = false;

  const onClick = (event: Event): void => {
    const action = (event.target as Element | null)?.closest?.(
      "[data-chrono-action]",
    );
    if (action && root.contains(action)) {
      const name = action.getAttribute("data-chrono-action");
      if (name === "prev" || name === "next" || name === "today") {
        controller[name]();
      } else if (name === "level") {
        const state = controller.getState();
        if (state.canGoUp) {
          controller.setLevel(state.level === "day" ? "month" : "year");
        }
      } else if (name === "clear") {
        controller.clear();
      }
      return;
    }
    const hit = cellOf(event.target, root);
    if (!hit) return;
    if (
      controller.getState().kind === "multi" &&
      (event as MouseEvent).shiftKey
    ) {
      controller.extendTo(hit.date);
    } else {
      controller.pick(hit.date, "pointer");
    }
  };
  const onKeydown = (event: Event): void => {
    const hit = cellOf(event.target, root);
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
      // Escape is stopped only when it cancelled something (A18).
      if (key.key === "Escape") key.stopPropagation();
    } else {
      keyboardMove = false;
    }
  };
  const onKeyup = (): void => {
    keyboardMove = false;
  };
  const onMouseOver = (event: Event): void => {
    if (!controller.getState().draft) return;
    const hit = cellOf(event.target, root);
    if (hit) controller.setPreview(hit.date);
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
      const key = focusKeyOf(controller.getState());
      syncRovingTabIndex(root, key);
      if (keyboardMove) {
        focusDateCell(root, key);
        keyboardMove = false;
      }
    },
    destroy() {
      root.removeEventListener("click", onClick);
      root.removeEventListener("keydown", onKeydown);
      root.removeEventListener("keyup", onKeyup);
      root.removeEventListener("mouseover", onMouseOver);
      root.removeEventListener("mouseleave", onMouseLeave);
      controller.destroy();
    },
  };
}

/**
 * Controller-only panels for plain DOM (02 §6): you render the markup from
 * `state` and stamp `controller.get*Attributes()` with `applyAttributes`.
 * Listeners are delegated on `root`: click and keydown on `[data-chrono-key]`
 * cells, click on `[data-chrono-action="prev|next|today|level|clear"]`.
 * `autoFocus` focuses the active cell once.
 */
export function createDatePanel(
  root: HTMLElement,
  options: DatePanelOptions = {},
) {
  return bindPanel<unknown, DatePanelOptions>(
    root,
    createDatePanelController(options),
  );
}

export function createDateRangePanel(
  root: HTMLElement,
  options: DateRangePanelOptions = {},
) {
  return bindPanel<unknown, DateRangePanelOptions>(
    root,
    createDateRangePanelController(options),
  );
}

export function createMultiDatePanel(
  root: HTMLElement,
  options: MultiDatePanelOptions = {},
) {
  return bindPanel<unknown, MultiDatePanelOptions>(
    root,
    createMultiDatePanelController(options),
  );
}
