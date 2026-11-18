import { getGlobalState } from "../../foundation/index.js";
import {
  type AutoScroll,
  createAutoScroll,
  scrollParent,
} from "./auto-scroll.js";
import { elementHitTest, type HitPoint, type HitTarget } from "./hit-test.js";
import type { EditKind } from "./drag-keyboard.js";

const LONG_PRESS_MS = 400;
const THRESHOLD = 4;
const TOUCH_SLOP = 8;

export type DragPointerHandlers = {
  /** The press landed on an event (`segmentKey`); can it start this edit? */
  canStart(kind: EditKind, segmentKey: string): boolean;
  /** The drag began on `target`. Return `false` to refuse it. */
  begin(kind: EditKind, segmentKey: string, target: HitTarget): boolean;
  update(target: HitTarget): void;
  drop(): void;
  cancel(): void;
  hitTest?: (point: HitPoint) => HitTarget | null;
  /** Scroll container for auto-scroll; `false` turns it off. */
  scroll?: () => HTMLElement | null | false;
};

export type DragPointer = { destroy(): void };

const hasFrames = typeof requestAnimationFrame === "function";
const frame = (callback: () => void): number =>
  hasFrames
    ? requestAnimationFrame(callback)
    : (setTimeout(callback, 16) as unknown as number);
const unframe = (handle: number): void =>
  hasFrames
    ? cancelAnimationFrame(handle)
    : clearTimeout(handle as unknown as ReturnType<typeof setTimeout>);

/** One drag per page, even with two calendars or two copies of core (plan 09 M13). */
const lock = () =>
  getGlobalState("calendar-drag", () => ({ owner: null as symbol | null }));

/**
 * Pointer pipeline for moving and resizing events (plan 09 M7, M13, M14): primary button
 * only, a 4 px threshold (touch: a 400 ms long press), one active drag per page, throttled
 * to one update per frame, with auto-scroll near the edges.
 */
export function createDragPointer(
  root: HTMLElement,
  handlers: DragPointerHandlers,
): DragPointer {
  const hitTest = handlers.hitTest ?? elementHitTest;
  const token = Symbol("drag");
  let pressed: {
    kind: EditKind;
    key: string;
    x: number;
    y: number;
    id: number;
    touch: boolean;
    element: Element;
  } | null = null;
  let dragging = false;
  let longPress: ReturnType<typeof setTimeout> | undefined;
  let pendingFrame = 0;
  let last: PointerEvent | undefined;
  let scroller: AutoScroll | undefined;
  let swallowClick = false;

  const onSelectStart = (event: Event): void => event.preventDefault();
  const onTouchMove = (event: Event): void => {
    if (event.cancelable) event.preventDefault();
  };

  const finish = (): void => {
    if (longPress !== undefined) {
      clearTimeout(longPress);
      longPress = undefined;
    }
    if (pendingFrame !== 0) {
      unframe(pendingFrame);
      pendingFrame = 0;
    }
    scroller?.stop();
    scroller = undefined;
    document.removeEventListener("selectstart", onSelectStart);
    document.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("blur", onBlur);
    if (pressed) {
      try {
        pressed.element.releasePointerCapture?.(pressed.id);
      } catch {
        // The pointer may already be gone.
      }
    }
    if (lock().owner === token) lock().owner = null;
    pressed = null;
    dragging = false;
    last = undefined;
  };

  const begin = (): boolean => {
    if (!pressed || dragging) return false;
    if (lock().owner !== null) return false;
    const target = hitTest({ x: pressed.x, y: pressed.y });
    if (!target || !handlers.begin(pressed.kind, pressed.key, target))
      return false;
    lock().owner = token;
    dragging = true;
    document.addEventListener("selectstart", onSelectStart);
    if (pressed.touch)
      document.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("blur", onBlur);
    try {
      pressed.element.setPointerCapture?.(pressed.id);
    } catch {
      // setPointerCapture throws for inactive pointers.
    }
    const container = handlers.scroll?.();
    if (container !== false) {
      scroller = createAutoScroll(() => container ?? scrollParent(root));
    }
    return true;
  };

  function onBlur(): void {
    if (dragging) {
      handlers.cancel();
      finish();
    }
  }

  const onDown = (event: PointerEvent): void => {
    if (event.button !== 0 || pressed) return; // primary button; a second pointer is ignored
    const element = (event.target as Element | null)?.closest?.(
      "[data-chrono-event-key]",
    );
    if (!element || !root.contains(element)) return;
    const handle = (event.target as Element).closest?.("[data-chrono-resize]");
    const edge = handle?.getAttribute("data-chrono-resize");
    const kind: EditKind =
      edge === "start"
        ? "resize-start"
        : edge === "end"
          ? "resize-end"
          : "move";
    const key = element.getAttribute("data-chrono-event-key") ?? "";
    if (!handlers.canStart(kind, key)) return;
    pressed = {
      kind,
      key,
      x: event.clientX,
      y: event.clientY,
      id: event.pointerId,
      touch: event.pointerType === "touch",
      element: event.target as Element,
    };
    if (pressed.touch) {
      longPress = setTimeout(() => {
        longPress = undefined;
        if (!begin()) finish();
      }, LONG_PRESS_MS);
    }
  };

  const onMove = (event: PointerEvent): void => {
    if (!pressed || event.pointerId !== pressed.id) return;
    if (!dragging) {
      const slop = pressed.touch ? TOUCH_SLOP : THRESHOLD;
      const far =
        Math.abs(event.clientX - pressed.x) > slop ||
        Math.abs(event.clientY - pressed.y) > slop;
      if (pressed.touch) {
        if (far && longPress !== undefined) finish(); // the finger scrolled: no drag
        return;
      }
      if (!far) return;
      if (!begin()) {
        finish();
        return;
      }
    }
    last = event;
    scroller?.update({ x: event.clientX, y: event.clientY });
    if (pendingFrame !== 0) return;
    pendingFrame = frame(() => {
      pendingFrame = 0;
      const move = last;
      if (!move || !dragging) return;
      const target = hitTest({ x: move.clientX, y: move.clientY });
      if (target) handlers.update(target);
    });
  };

  const onUp = (event: PointerEvent): void => {
    if (!pressed || event.pointerId !== pressed.id) return;
    if (dragging) {
      swallowClick = true;
      handlers.drop();
    }
    finish();
  };

  const onCancel = (event: PointerEvent): void => {
    if (!pressed || event.pointerId !== pressed.id) return;
    if (dragging) handlers.cancel();
    finish();
  };

  /** The click after a real drag must not select or activate the event. */
  const onClick = (event: Event): void => {
    if (swallowClick) {
      swallowClick = false;
      event.stopPropagation();
      event.preventDefault();
    }
  };

  root.addEventListener("pointerdown", onDown);
  root.addEventListener("pointermove", onMove);
  root.addEventListener("pointerup", onUp);
  root.addEventListener("pointercancel", onCancel);
  root.addEventListener("click", onClick, true);

  return {
    destroy() {
      if (dragging) handlers.cancel();
      finish();
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointercancel", onCancel);
      root.removeEventListener("click", onClick, true);
    },
  };
}
