import {
  type Attributes,
  normalizeAttributes,
} from "@zealakit/chrono-core/foundation";

const stamped = new WeakMap<Element, Set<string>>();

/**
 * Stamp a core attribute record onto an element: set what is present, remove
 * what an earlier call set and the record no longer has. Use it in your own
 * templates: `applyAttributes(cell, calendar.controller.getCellAttributes(day))`.
 */
export function applyAttributes(
  element: Element,
  attributes: Attributes,
): void {
  const next = normalizeAttributes(attributes);
  const previous = stamped.get(element);
  for (const name of previous ?? []) {
    if (!(name in next)) element.removeAttribute(name);
  }
  for (const [name, value] of Object.entries(next)) {
    if (element.getAttribute(name) !== value) element.setAttribute(name, value);
  }
  stamped.set(element, new Set(Object.keys(next)));
}
