import {
  type DateTimeInputController,
  type DateTimeInputOptions,
  type DateTimeInputState,
  type DateTimeRangeInputController,
  type DateTimeRangeInputOptions,
  type DateTimeRangeInputState,
  createDateTimeInputController,
  createDateTimeRangeInputController,
} from "@zealakit/chrono-core/datetime";
import { focusPart } from "@zealakit/chrono-core/foundation";

type Part = Parameters<DateTimeInputController["focusPart"]>[0];
type Resolve = (target: EventTarget | null) => {
  controller: DateTimeInputController;
  scope: Element;
} | null;

/** Wire the delegated listeners every date-time field shares. */
function attach(
  root: HTMLElement,
  resolve: Resolve,
  onBlurOutside: () => void,
  onReset: () => void,
  isRendering: () => boolean,
) {
  let move = false;
  let pendingScope: Element | null = null;
  const partOf = (target: EventTarget | null): Element | null =>
    (target as Element | null)?.closest?.("[data-chrono-part]") ?? null;
  const textOf = (target: EventTarget | null): Element | null =>
    (target as Element | null)?.closest?.("[data-chrono-text]") ?? null;
  const subOf = (
    found: { controller: DateTimeInputController },
    text: Element,
  ) =>
    text.getAttribute("data-chrono-text") === "time"
      ? found.controller.getTime()
      : found.controller.getDate();

  const onKeydown = (event: Event): void => {
    const key = event as KeyboardEvent;
    const found = resolve(event.target);
    if (!found) return;
    const part = partOf(event.target);
    const text = textOf(event.target);
    if (part) {
      move = true;
      pendingScope = found.scope;
      if (
        found.controller.handleKeyDown(
          part.getAttribute("data-chrono-part") as Part,
          key.key,
          { shift: key.shiftKey, ctrl: key.ctrlKey, meta: key.metaKey },
        )
      ) {
        key.preventDefault();
      } else {
        move = false;
      }
      // Several renders can follow one key press; keep refocusing until the handler is done.
      queueMicrotask(() => {
        move = false;
      });
    } else if (text && subOf(found, text).handleTextKeyDown(key.key)) {
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
    if (part && found)
      found.controller.focusPart(part.getAttribute("data-chrono-part") as Part);
  };
  const onFocusout = (event: Event): void => {
    if (isRendering()) return;
    const found = resolve(event.target);
    if (!found) return;
    if (partOf(event.target)) found.controller.settle();
    const text = textOf(event.target);
    if (text) subOf(found, text).commitText();
    const next = (event as FocusEvent).relatedTarget as Node | null;
    if (!next || !root.contains(next)) onBlurOutside();
  };
  const onInput = (event: Event): void => {
    const found = resolve(event.target);
    const text = textOf(event.target);
    if (found && text)
      subOf(found, text).setText((event.target as HTMLInputElement).value);
  };
  const onPaste = (event: Event): void => {
    const found = resolve(event.target);
    if (!found || !(partOf(event.target) || textOf(event.target))) return;
    event.preventDefault();
    found.controller.paste(
      (event as ClipboardEvent).clipboardData?.getData("text") ?? "",
    );
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
      queueMicrotask(() => {
        move = false;
      });
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
    syncFocus(state: DateTimeInputState): void {
      if (!move) return;
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

export type VanillaDateTimeInput = {
  readonly controller: DateTimeInputController;
  getState(): DateTimeInputState;
  subscribe(listener: (state: DateTimeInputState) => void): () => void;
  setOptions(options: Partial<DateTimeInputOptions>): void;
  /** Call after each render: after a key press, moves DOM focus to the active part. */
  syncFocus(): void;
  /** Suspend blur handling while you re-render the field. */
  suspend(fn: () => void): void;
  destroy(): void;
};

/**
 * Controller-only date-time field for plain DOM: render the segments (or two
 * `[data-chrono-text="date|time"]` inputs) from `state` and stamp the attribute records
 * with `applyAttributes`. Listeners are delegated on `root`.
 */
export function createDateTimeInput(
  root: HTMLElement,
  options: DateTimeInputOptions = {},
): VanillaDateTimeInput {
  const controller = createDateTimeInputController(options);
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

export type VanillaDateTimeRangeInput = {
  readonly controller: DateTimeRangeInputController;
  getState(): DateTimeRangeInputState;
  subscribe(listener: (state: DateTimeRangeInputState) => void): () => void;
  setOptions(options: Partial<DateTimeRangeInputOptions>): void;
  syncFocus(): void;
  suspend(fn: () => void): void;
  destroy(): void;
};

/** Two date-time fields in one group. Mark each field with `data-chrono-field="start"` or `"end"`. */
export function createDateTimeRangeInput(
  root: HTMLElement,
  options: DateTimeRangeInputOptions = {},
): VanillaDateTimeRangeInput {
  const controller = createDateTimeRangeInputController(options);
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
        (lastSide === "end"
          ? controller.getEnd()
          : controller.getStart()
        ).getState(),
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
