import { parseIsoDate, type PlainDate } from "@zealakit/chrono-core/foundation";

/** The date a delegated event happened on, from the nearest `data-chrono-key`. */
export function dateOf(
  target: EventTarget | null,
  root: Element,
): { element: Element; date: PlainDate } | null {
  const element = (target as Element | null)?.closest?.("[data-chrono-key]");
  if (!element || !root.contains(element)) return null;
  try {
    return {
      element,
      date: parseIsoDate(element.getAttribute("data-chrono-key") ?? ""),
    };
  } catch {
    return null;
  }
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
