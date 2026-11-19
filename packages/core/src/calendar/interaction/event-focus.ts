/**
 * Pure keyboard focus model for the "interactive cell" pattern (plan 05 E11):
 * the calendar is one tab stop; Enter/F2 enters a cell's events, Escape/F2
 * returns to the owning cell. No DOM access — the controller applies the focus.
 */

export type FocusMode = "navigation" | "interaction";

export type FocusState = {
  mode: FocusMode;
  /** The owning cell key (`YYYY-MM-DD` or `YYYY-MM-DDTHH:mm`). */
  cellKey: string;
  /** The focused item key inside interaction mode (an event or "+N more"). */
  itemKey?: string;
};

/** Ordered focusable items of a cell: event keys, then the "+N more" key last. */
export type FocusItems = readonly string[];

/** Enter interaction mode on the first item of a cell (E11). */
export function enterCell(cellKey: string, items: FocusItems): FocusState {
  return { mode: "interaction", cellKey, itemKey: items[0] };
}

/** Whether a key leaves interaction mode back to the owning cell (Escape / F2). */
export function isExitKey(key: string): boolean {
  return key === "Escape" || key === "F2";
}

/**
 * Move focus inside interaction mode (plan 05 §2.5). Returns the next state for
 * ↓/Tab (next, wrapping), ↑/Shift+Tab (previous, wrapping), Home/End
 * (first/last), Escape/F2 (back to navigation), or `null` when the key is not
 * an interaction-movement key (Space/Enter are handled by the controller).
 */
export function stepFocus(
  focus: FocusState,
  key: string,
  modifiers: { shift: boolean },
  items: FocusItems,
): FocusState | null {
  if (items.length === 0) {
    return null;
  }
  const index = Math.max(0, items.indexOf(focus.itemKey ?? ""));
  if (key === "ArrowDown" || (key === "Tab" && !modifiers.shift)) {
    return { ...focus, itemKey: items[(index + 1) % items.length] };
  }
  if (key === "ArrowUp" || (key === "Tab" && modifiers.shift)) {
    return {
      ...focus,
      itemKey: items[(index - 1 + items.length) % items.length],
    };
  }
  if (key === "Home") {
    return { ...focus, itemKey: items[0] };
  }
  if (key === "End") {
    return { ...focus, itemKey: items[items.length - 1] };
  }
  if (isExitKey(key)) {
    return { mode: "navigation", cellKey: focus.cellKey };
  }
  return null;
}
