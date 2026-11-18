import {
  type Attributes,
  normalizeAttributes,
  splitProperties,
} from "@zealakit/chrono-core/foundation";
import type { HTMLAttributes } from "react";
import { toStyleProperties } from "./style-properties.js";

export type ChronoProps = HTMLAttributes<HTMLElement> & {
  [key: `data-${string}`]: string;
};

/** HTML attribute names React spells in camelCase. */
const REACT_NAMES: Record<string, string> = {
  tabindex: "tabIndex",
  inputmode: "inputMode",
};

/**
 * Core attribute record to React props: strings only, `tabindex` and `inputmode`
 * become `tabIndex` and `inputMode`, and `--chrono-*` custom properties become a `style` object via
 * `toStyleProperties` (plan 05 R2).
 */
export function toReactProps(attributes: Attributes): ChronoProps {
  const { attributes: attrs } = splitProperties(attributes);
  const props: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(normalizeAttributes(attrs))) {
    props[REACT_NAMES[key] ?? key] = value;
  }
  if ("tabIndex" in props) {
    props.tabIndex = Number(props.tabIndex);
  }
  const style = toStyleProperties(attributes);
  if (style) {
    props.style = style;
  }
  return props as ChronoProps;
}
