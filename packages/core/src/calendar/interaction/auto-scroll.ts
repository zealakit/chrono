/**
 * Auto-scroll while a drag is near an edge of the scroll container (plan 09 M12).
 * `speed(d) = d >= 40 ? 0 : round(20 · (1 − d / 40))` pixels per frame.
 */
export const EDGE = 40;
export const MAX_SPEED = 20;

export function autoScrollSpeed(distance: number): number {
  const d = Math.max(0, distance);
  return d >= EDGE ? 0 : Math.round(MAX_SPEED * (1 - d / EDGE));
}

export type AutoScroll = {
  /** Start the loop for the pointer position; call again to move the point. */
  update(point: { x: number; y: number }): void;
  stop(): void;
};

const hasFrames = typeof requestAnimationFrame === "function";
const frame = (callback: () => void): number =>
  hasFrames
    ? requestAnimationFrame(callback)
    : (setTimeout(callback, 16) as unknown as number);
const unframe = (handle: number): void =>
  hasFrames
    ? cancelAnimationFrame(handle)
    : clearTimeout(handle as unknown as ReturnType<typeof setTimeout>);

/** The nearest scrollable ancestor of `element`, or `null`. */
export function scrollParent(element: Element | null): HTMLElement | null {
  let node = element?.parentElement ?? null;
  while (node) {
    const style = getComputedStyle(node);
    if (/(auto|scroll)/.test(`${style.overflowY} ${style.overflowX}`)) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

/** A rAF loop that scrolls `getContainer()` toward the pointer; stops when asked. */
export function createAutoScroll(
  getContainer: () => HTMLElement | null,
): AutoScroll {
  let point: { x: number; y: number } | null = null;
  let handle = 0;

  const tick = (): void => {
    handle = 0;
    const container = getContainer();
    if (!point || !container) return;
    const rect = container.getBoundingClientRect();
    const dy =
      autoScrollSpeed(point.y - rect.top) * -1 +
      autoScrollSpeed(rect.bottom - point.y);
    const dx =
      autoScrollSpeed(point.x - rect.left) * -1 +
      autoScrollSpeed(rect.right - point.x);
    if (dx !== 0 || dy !== 0) {
      container.scrollLeft += dx;
      container.scrollTop += dy;
    }
    handle = frame(tick);
  };

  return {
    update(next) {
      point = next;
      if (handle === 0) handle = frame(tick);
    },
    stop() {
      point = null;
      if (handle !== 0) {
        unframe(handle);
        handle = 0;
      }
    },
  };
}
