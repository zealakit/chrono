import {
  type Attributes,
  normalizeAttributes,
  splitProperties,
} from "@zealakit/chrono-core/foundation";
import { toStyleProperties } from "./style-properties.js";

/**
 * Core attribute record to Vue props: strings only, and `--chrono-*` custom
 * properties become a `style` object via `toStyleProperties` (plan 05 R2).
 * `mergeProps` merges that style with the consumer's.
 */
export function toVueProps(attributes: Attributes): Record<string, unknown> {
  const { attributes: attrs } = splitProperties(attributes);
  const props: Record<string, unknown> = normalizeAttributes(attrs);
  const style = toStyleProperties(attributes);
  if (style) {
    props.style = style;
  }
  return props;
}

export type Modifiers = { shift: boolean; ctrl: boolean; meta: boolean };

export const modifiersOf = (event: KeyboardEvent): Modifiers => ({
  shift: event.shiftKey,
  ctrl: event.ctrlKey,
  meta: event.metaKey,
});
