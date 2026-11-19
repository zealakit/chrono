import {
  type DateInputController,
  type DateInputOptions,
  type DateInputState,
  type DateRangeInputController,
  type DateRangeInputOptions,
  type DateRangeInputState,
  createDateInputController,
  createDateRangeInputController,
} from "@zealakit/chrono-core/date";
import { focusPart } from "@zealakit/chrono-core/foundation";

type Resolve = (target: EventTarget | null) => {
  controller: DateInputController;
  scope: Element;
} | null;

/** Wire the delegated listeners every date field shares; returns the cleanup and focus sync. */
function attach(
  root: HTMLElement,
  resolve: Resolve,
  onBlurOutside: () => void,
  onReset: () => void,
  /** While the app re-renders, focus changes must not commit. */
  isRendering: () => boolean = () => false,
) {
  let move = false;
  let pendingScope: Element | null = null;

  const partOf = (target: EventTarget | null): Element | null =>
    (target as Element | null)?.closest?.("[data-chrono-part]") ?? null;
  const textOf = (target: EventTarget | null): Element | null =>
    (target as Element | null)?.closest?.("[data-chrono-text]") ?? null;
  const partName = (element: Element): "day" | "month" | "year" =>
    element.getAttribute("data-chrono-part") as "day" | "month" | "year";

  const onKeydown = (event: Event): void => {
    const key = event as KeyboardEvent;
    const part = partOf(event.target);
    const text = textOf(event.target);
    const found = resolve(event.target);
    if (!found) return;
    if (part) {
      move = true;
      pendingScope = found.scope;
      if (
        found.controller.handleKeyDown(partName(part), key.key, {
          shift: key.shiftKey,
          ctrl: key.ctrlKey,
          meta: key.metaKey,
        })
      ) {
        key.preventDefault();
      } else {
        move = false;
      }
    } else if (text && found.controller.handleTextKeyDown(key.key)) {
      key.preventDefault();
      key.stopPropagation();
    }
  };
  const onKeyup = (): void => {
    move = false;
  };
  const onFocusin = (event: Event): void => {
    const part = partOf(event.target);
    const found = resolve(event.target);
    if (part && found) found.controller.focusPart(partName(part));
  };
  const onFocusout = (event: Event): void => {
    if (isRendering()) return;
    const found = resolve(event.target);
    if (!found) return;
    if (partOf(event.target)) found.controller.settle();
    if (textOf(event.target)) found.controller.commitText();
    const next = (event as FocusEvent).relatedTarget as Node | null;
    if (!next || !root.contains(next)) onBlurOutside();
  };
  const onInput = (event: Event): void => {
    const found = resolve(event.target);
    if (found && textOf(event.target)) {
      found.controller.setText((event.target as HTMLInputElement).value);
    }
  };
  const onPaste = (event: Event): void => {
    const found = resolve(event.target);
    if (!found || !(partOf(event.target) || textOf(event.target))) return;
    event.preventDefault();
    const text = (event as ClipboardEvent).clipboardData?.getData("text") ?? "";
    if (textOf(event.target)) {
      found.controller.setText(text);
      found.controller.commitText();
    } else {
      found.controller.paste(text);
    }
  };
  const onClick = (event: Event): void => {
    const action = (event.target as Element | null)?.closest?.(
      "[data-chrono-action]",
    );
    if (action?.getAttribute("data-chrono-action") !== "clear") return;
    const found = resolve(event.target);
    if (found) {
      move = true;
      pendingScope = found.scope;
      found.controller.clear();
    }
  };

  const form = root.closest("form");
  root.addEventListener("keydown", onKeydown);
  root.addEventListener("keyup", onKeyup);
  root.addEventListener("focusin", onFocusin);
  root.addEventListener("focusout", onFocusout);
  root.addEventListener("input", onInput);
  root.addEventListener("paste", onPaste);
  root.addEventListener("click", onClick);
  form?.addEventListener("reset", onReset);

  return {
    /** Call after each render: after a key press, move DOM focus to the active part. */
    syncFocus(state: DateInputState): void {
      if (!move) return;
      move = false;
      focusPart(pendingScope ?? root, state.focusedPart);
    },
    destroy(): void {
      root.removeEventListener("keydown", onKeydown);
      root.removeEventListener("keyup", onKeyup);
      root.removeEventListener("focusin", onFocusin);
      root.removeEventListener("focusout", onFocusout);
      root.removeEventListener("input", onInput);
      root.removeEventListener("paste", onPaste);
      root.removeEventListener("click", onClick);
      form?.removeEventListener("reset", onReset);
    },
  };
}

export type VanillaDateInput = {
  readonly controller: DateInputController;
  getState(): DateInputState;
  subscribe(listener: (state: DateInputState) => void): () => void;
  setOptions(options: Partial<DateInputOptions>): void;
  /** Call after each render: after a key press, moves DOM focus to the active part. */
  syncFocus(): void;
  /** Suspend blur handling while you re-render the field. */
  suspend(fn: () => void): void;
  destroy(): void;
};

/**
 * Controller-only date field for plain DOM: render segments (or a
 * `[data-chrono-text]` input) from `state` and stamp the attribute records with
 * `applyAttributes`. Listeners are delegated on `root`.
 */
export function createDateInput(
  root: HTMLElement,
  options: DateInputOptions = {},
): VanillaDateInput {
  const controller = createDateInputController(options);
  let rendering = false;
  const wiring = attach(
    root,
    () => ({ controller, scope: root }),
    () => controller.commit(),
    () => controller.reset(),
    () => rendering,
  );
  return {
    controller,
    getState: controller.getState,
    subscribe: controller.subscribe,
    setOptions: controller.setOptions,
    syncFocus: () => wiring.syncFocus(controller.getState()),
    suspend(fn) {
      rendering = true;
      try {
        fn();
      } finally {
        rendering = false;
      }
    },
    destroy() {
      wiring.destroy();
      controller.destroy();
    },
  };
}

export type VanillaDateRangeInput = {
  readonly controller: DateRangeInputController;
  getState(): DateRangeInputState;
  subscribe(listener: (state: DateRangeInputState) => void): () => void;
  setOptions(options: Partial<DateRangeInputOptions>): void;
  syncFocus(): void;
  suspend(fn: () => void): void;
  destroy(): void;
};

/**
 * Two date fields in one group. Mark each field element with
 * `data-chrono-field="start"` or `"end"`.
 */
export function createDateRangeInput(
  root: HTMLElement,
  options: DateRangeInputOptions = {},
): VanillaDateRangeInput {
  const controller = createDateRangeInputController(options);
  let rendering = false;
  let lastSide: "start" | "end" = "start";
  const wiring = attach(
    root,
    (target) => {
      const scope = (target as Element | null)?.closest?.(
        "[data-chrono-field]",
      );
      if (!scope || !root.contains(scope)) return null;
      lastSide =
        scope.getAttribute("data-chrono-field") === "end" ? "end" : "start";
      return {
        controller:
          lastSide === "end" ? controller.getEnd() : controller.getStart(),
        scope,
      };
    },
    () => controller.commit(),
    () => controller.reset(),
    () => rendering,
  );
  return {
    controller,
    getState: controller.getState,
    subscribe: controller.subscribe,
    setOptions: controller.setOptions,
    syncFocus: () =>
      wiring.syncFocus(
        lastSide === "end"
          ? controller.getEnd().getState()
          : controller.getStart().getState(),
      ),
    suspend(fn) {
      rendering = true;
      try {
        fn();
      } finally {
        rendering = false;
      }
    },
    destroy() {
      wiring.destroy();
      controller.destroy();
    },
  };
}
