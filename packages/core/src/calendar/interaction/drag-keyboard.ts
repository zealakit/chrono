/** Pure keyboard editing keys (plan 09 M10, §13.3). */

export type EditKind = "move" | "resize-start" | "resize-end";

export type Shortcuts = {
  move: string;
  resizeEnd: string;
  resizeStart: string;
};

/** `R` resizes the end, `Shift+R` the start. */
export const DEFAULT_SHORTCUTS: Shortcuts = {
  move: "m",
  resizeEnd: "r",
  resizeStart: "R",
};

export type KeyStep =
  | { type: "step"; days: number; minutes: number }
  | { type: "drop" }
  | { type: "cancel" };

/**
 * The edit a shortcut starts, or `null`. Matched case-insensitively on `key`; ignored
 * with Ctrl, Alt or Meta so browser shortcuts keep working.
 */
export function matchShortcut(
  key: string,
  modifiers: { shift: boolean; ctrl: boolean; meta: boolean; alt?: boolean },
  shortcuts: Shortcuts | false,
): EditKind | null {
  if (
    shortcuts === false ||
    modifiers.ctrl ||
    modifiers.meta ||
    modifiers.alt
  ) {
    return null;
  }
  const same = (a: string) => a.toLowerCase() === key.toLowerCase();
  if (same(shortcuts.move) && !modifiers.shift) return "move";
  if (same(shortcuts.resizeEnd) && !modifiers.shift) return "resize-end";
  if (
    same(shortcuts.resizeStart) &&
    (modifiers.shift || shortcuts.resizeStart !== shortcuts.resizeEnd)
  ) {
    return "resize-start";
  }
  return null;
}

/**
 * What a key does while editing. Time grid: ↑/↓ by `snap` minutes, ←/→ by a day;
 * month and the all-day row: ←/→ by a day, ↑/↓ by a week (a move only: a resize moves
 * its edge along one axis and the other axis moves nothing). `rtl` swaps ←/→.
 */
export function editStep(
  kind: EditKind,
  key: string,
  context: { timeGrid: boolean; snap: number; rtl?: boolean },
): KeyStep | null {
  if (key === "Enter") return { type: "drop" };
  if (key === "Escape") return { type: "cancel" };
  const horizontal = key === "ArrowLeft" ? -1 : key === "ArrowRight" ? 1 : 0;
  const vertical = key === "ArrowUp" ? -1 : key === "ArrowDown" ? 1 : 0;
  if (!horizontal && !vertical) return null;
  const side = context.rtl ? -horizontal : horizontal;
  if (context.timeGrid) {
    if (kind === "move") {
      return { type: "step", days: side, minutes: vertical * context.snap };
    }
    // Resizing a time-grid event changes its edge vertically only.
    return { type: "step", days: 0, minutes: vertical * context.snap };
  }
  if (kind === "move") {
    return { type: "step", days: side + vertical * 7, minutes: 0 };
  }
  return { type: "step", days: side, minutes: 0 };
}
