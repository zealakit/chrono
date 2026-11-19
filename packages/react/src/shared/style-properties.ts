import {
  splitProperties,
  type Attributes,
} from "@zealakit/chrono-core/foundation";
import type { CSSProperties } from "react";

/**
 * The one place that turns Chrono layout numbers into inline styles
 * (plan 05 R2): `--chrono-*` custom properties become a React `style` object.
 * Chrono sets no visual styles — only these inert layout properties.
 */
export function toStyleProperties(
  attributes: Attributes,
): CSSProperties | undefined {
  const { properties } = splitProperties(attributes);
  if (Object.keys(properties).length === 0) {
    return undefined;
  }
  return properties as CSSProperties;
}
