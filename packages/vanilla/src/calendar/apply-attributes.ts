import {
  type Attributes,
  normalizeAttributes,
  splitProperties,
} from "@zealakit/chrono-core/foundation";
import { toStyleProperties } from "../shared/style-properties.js";

const stamped = new WeakMap<Element, Set<string>>();

function styleText(properties: Record<string, string>): string {
  return Object.entries(properties)
    .map(([name, value]) => `${name}: ${value}`)
    .join("; ");
}

/**
 * Stamp a core attribute record onto an element: set what is present, remove
 * what an earlier call set and the record no longer has. `--chrono-*` custom
 * properties become the element's `style` (plan 05 R2). Use it in your own
 * templates: `applyAttributes(cell, calendar.controller.getCellAttributes(day))`.
 */
export function applyAttributes(
  element: Element,
  attributes: Attributes,
): void {
  const { attributes: attrs } = splitProperties(attributes);
  const next: Record<string, string> = normalizeAttributes(attrs);
  const properties = toStyleProperties(attributes);
  if (properties) {
    next.style = styleText(properties);
  }
  const previous = stamped.get(element);
  for (const name of previous ?? []) {
    if (!(name in next)) element.removeAttribute(name);
  }
  for (const [name, value] of Object.entries(next)) {
    if (element.getAttribute(name) !== value) element.setAttribute(name, value);
  }
  stamped.set(element, new Set(Object.keys(next)));
}
