import {
  splitProperties,
  type Attributes,
} from "@zealakit/chrono-core/foundation";

/**
 * The one place that turns Chrono layout numbers into inline styles
 * (plan 05 R2): `--chrono-*` custom properties become a CSS declaration string
 * for the element's `style` attribute. Chrono sets no visual styles.
 */
export function toStyleProperties(
  attributes: Attributes,
): Record<string, string> | undefined {
  const { properties } = splitProperties(attributes);
  return Object.keys(properties).length > 0 ? properties : undefined;
}
