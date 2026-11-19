import { elementHitTest, type HitPoint, type HitTarget } from "./hit-test.js";

const LONG_PRESS_MS = 400;
const TOUCH_SLOP = 8;

export type SelectionPointerHandlers = {
  start(target: HitTarget): void;
  extend(target: HitTarget): void;
  confirm(): void;
  cancel(): void;
  /** Skip a press (for example on an event that is being dragged instead). */
  ignore?: (event: PointerEvent) => boolean;
  /** Tests pass their own; the default uses `elementHitTest`. */
  hitTest?: (point: HitPoint) => HitTarget | null;
};

const hasFrames = typeof requestAnimationFrame === "function";
const schedule = (callback: () => void): number =>
  hasFrames
    ? requestAnimationFrame(callback)
    : (setTimeout(callback, 16) as unknown as number);
const cancel = (handle: number): void =>
  hasFrames
    ? cancelAnimationFrame(handle)
    : clearTimeout(handle as unknown as ReturnType<typeof setTimeout>);

export type SelectionPointer = { destroy(): void };

/**
 * Pointer selection pipeline (plan 05 §13.2): drag-select on `[data-chrono-key]`
 * cells. Touch arms a 400 ms long press (canceled by a move past 8 px); a
 * short touch scrolls as usual (E18). Pointer moves are throttled to one per
 * animation frame.
 */
export function createSelectionPointer(
  root: HTMLElement,
  handlers: SelectionPointerHandlers,
): SelectionPointer {
  const hitTest = handlers.hitTest ?? elementHitTest;
  let selecting = false;
  let longPressTimer: ReturnType<typeof setTimeout> | undefined;
  let frame = 0;
  let startX = 0;
  let startY = 0;
  let lastMove: PointerEvent | undefined;

  const clearLongPress = (): void => {
    if (longPressTimer !== undefined) {
      clearTimeout(longPressTimer);
      longPressTimer = undefined;
    }
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || handlers.ignore?.(event)) {
      return; // primary button only: a context-menu click never selects
    }
    const target = hitTest({ x: event.clientX, y: event.clientY });
    if (!target) {
      return;
    }
    if (event.pointerType === "touch") {
      startX = event.clientX;
      startY = event.clientY;
      clearLongPress();
      longPressTimer = setTimeout(() => {
        longPressTimer = undefined;
        selecting = true;
        (event.target as Element | null)?.setPointerCapture?.(event.pointerId);
        handlers.start(target);
      }, LONG_PRESS_MS);
      return;
    }
    selecting = true;
    (event.target as Element | null)?.setPointerCapture?.(event.pointerId);
    handlers.start(target);
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (longPressTimer !== undefined) {
      if (
        Math.abs(event.clientX - startX) > TOUCH_SLOP ||
        Math.abs(event.clientY - startY) > TOUCH_SLOP
      ) {
        clearLongPress();
      }
      return;
    }
    if (!selecting) {
      return;
    }
    lastMove = event;
    if (frame !== 0) {
      return;
    }
    frame = schedule(() => {
      frame = 0;
      const move = lastMove;
      lastMove = undefined;
      if (!move) {
        return;
      }
      const target = hitTest({ x: move.clientX, y: move.clientY });
      if (target) {
        handlers.extend(target);
      }
    });
  };

  const onPointerUp = (): void => {
    if (longPressTimer !== undefined) {
      clearLongPress();
      return;
    }
    if (!selecting) {
      return;
    }
    selecting = false;
    handlers.confirm();
  };

  const onPointerCancel = (): void => {
    clearLongPress();
    if (!selecting) {
      return;
    }
    selecting = false;
    handlers.cancel();
  };

  root.addEventListener("pointerdown", onPointerDown);
  root.addEventListener("pointermove", onPointerMove);
  root.addEventListener("pointerup", onPointerUp);
  root.addEventListener("pointercancel", onPointerCancel);

  return {
    destroy() {
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerup", onPointerUp);
      root.removeEventListener("pointercancel", onPointerCancel);
      clearLongPress();
      if (frame !== 0) {
        cancel(frame);
        frame = 0;
      }
    },
  };
}
