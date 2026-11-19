import { parseCellKey, type PlainDate } from "@zealakit/chrono-core/foundation";

/** The date a delegated event happened on, from the nearest `data-chrono-key`. */
export function dateOf(
  target: EventTarget | null,
  root: Element,
): { element: Element; date: PlainDate } | null {
  const element = (target as Element | null)?.closest?.("[data-chrono-key]");
  if (!element || !root.contains(element)) return null;
  try {
    const { date } = parseCellKey(
      element.getAttribute("data-chrono-key") ?? "",
    );
    return { element, date };
  } catch {
    return null;
  }
}

/** The event segment key of the nearest `[data-chrono-event-key]`. */
export function eventKeyOf(
  target: EventTarget | null,
  root: Element,
): { element: Element; key: string } | null {
  const element = (target as Element | null)?.closest?.(
    "[data-chrono-event-key]",
  );
  if (!element || !root.contains(element)) return null;
  const key = element.getAttribute("data-chrono-event-key");
  return key ? { element, key } : null;
}

/** The day key of the nearest `[data-overflow]` ("+N more") element. */
export function moreOf(
  target: EventTarget | null,
  root: Element,
): { element: Element; dayKey: string } | null {
  const element = (target as Element | null)?.closest?.("[data-overflow]");
  if (!element || !root.contains(element)) return null;
  const dayKey = element.getAttribute("data-chrono-key");
  return dayKey ? { element, dayKey } : null;
}

/** The action of the nearest `data-chrono-action` element (`prev`, `next`, `today`, `view`). */
export function actionOf(
  target: EventTarget | null,
  root: Element,
): { action: string; element: Element } | null {
  const element = (target as Element | null)?.closest?.("[data-chrono-action]");
  if (!element || !root.contains(element)) return null;
  return { action: element.getAttribute("data-chrono-action") ?? "", element };
}
