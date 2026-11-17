import {
  type Attributes,
  normalizeAttributes,
} from "@zealakit/chrono-core/foundation";
import type { HTMLAttributes } from "react";

export type ChronoProps = HTMLAttributes<HTMLElement> & {
  [key: `data-${string}`]: string;
};

/** Core attribute record to React props: strings only, `tabindex` becomes `tabIndex`. */
export function toReactProps(attributes: Attributes): ChronoProps {
  const props: Record<string, string> = {};
  for (const [key, value] of Object.entries(normalizeAttributes(attributes))) {
    props[key === "tabindex" ? "tabIndex" : key] = value;
  }
  if ("tabIndex" in props)
    (props as Record<string, unknown>).tabIndex = Number(props.tabIndex);
  return props as ChronoProps;
}
