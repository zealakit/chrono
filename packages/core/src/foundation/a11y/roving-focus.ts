import { toIsoString } from "../values/iso.js";
import type { PlainDate } from "../values/types.js";

type DateKey = PlainDate | string;

const keyOf = (value: DateKey): string =>
  typeof value === "string" ? value : toIsoString(value);

const escapeAttribute = (key: string): string => key.replace(/["\\]/g, "\\$&");

function findCell(container: ParentNode, key: string): HTMLElement | null {
  const selector = `[data-chrono-key="${escapeAttribute(key)}"]`;
  return (
    container.querySelector<HTMLElement>(
      `${selector}:not([data-outside-month])`,
    ) ?? container.querySelector<HTMLElement>(selector)
  );
}

/**
 * Move DOM focus to the cell carrying `data-chrono-key`. Call it from
 * lifecycle code only (an effect), never during render. Returns `false` when
 * the cell is not rendered.
 */
export function focusDateCell(container: ParentNode, date: DateKey): boolean {
  const cell = findCell(container, keyOf(date));
  if (!cell) {
    return false;
  }
  cell.focus();
  return true;
}

/** Roving tabindex: only the focused cell is a tab stop. */
export function syncRovingTabIndex(
  container: ParentNode,
  focused: DateKey,
): void {
  const key = keyOf(focused);
  const target = findCell(container, key);
  for (const cell of container.querySelectorAll<HTMLElement>(
    "[data-chrono-key]",
  )) {
    cell.tabIndex = cell === target ? 0 : -1;
  }
}

/** Move DOM focus to the input segment carrying `data-chrono-part` (plan 06 A10). */
export function focusPart(container: ParentNode, part: string): boolean {
  const element = container.querySelector<HTMLElement>(
    `[data-chrono-part="${escapeAttribute(part)}"]`,
  );
  if (!element) {
    return false;
  }
  element.focus();
  return true;
}

/**
 * Keep an option inside its scrolling listbox (plan 07 T15, R7). DOM behavior, not
 * styling; never throws where `scrollIntoView` or its options form is missing.
 */
export function scrollOptionIntoView(element: Element | null): void {
  if (!element || typeof element.scrollIntoView !== "function") {
    return;
  }
  try {
    element.scrollIntoView({ block: "nearest" });
  } catch {
    element.scrollIntoView();
  }
}
