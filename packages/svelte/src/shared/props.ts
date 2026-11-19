import {
  type Attributes,
  normalizeAttributes,
  splitProperties,
} from "@zealakit/chrono-core/foundation";
import { toStyleProperties } from "./style-properties.js";

export type Props = Record<string, unknown>;

/** A style value (string or object) as a CSS declaration string. */
function styleString(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined && v !== null && v !== false)
      .map(([key, v]) => `${key}: ${String(v)}`)
      .join("; ");
  }
  return "";
}

/**
 * Core attribute record to element props: strings only, and `--chrono-*`
 * custom properties become a `style` string (plan 05 R2). Svelte's spread
 * applies `style` as an attribute, so it must be a string.
 */
export const toProps = (attributes: Attributes): Record<string, unknown> => {
  const { attributes: attrs } = splitProperties(attributes);
  const props: Record<string, unknown> = normalizeAttributes(attrs);
  const style = toStyleProperties(attributes);
  if (style) {
    props.style = styleString(style);
  }
  return props;
};

export const modifiersOf = (event: KeyboardEvent) => ({
  shift: event.shiftKey,
  ctrl: event.ctrlKey,
  meta: event.metaKey,
});

/**
 * Merge a consumer's props with Chrono's. Chrono wins on contract attributes
 * (ARIA and `data-*`); `class` stays the consumer's; `style` merges the
 * consumer's with Chrono's `--chrono-*` layout properties. Handlers run the
 * consumer's first, then Chrono's unless the consumer called `preventDefault()`.
 */
export function mergeProps(consumer: Props, chrono: Props): Props {
  const merged: Props = { ...consumer, ...chrono };
  if ("class" in consumer) merged.class = consumer.class;
  if ("style" in consumer || "style" in chrono) {
    const parts = [
      styleString(consumer.style),
      styleString(chrono.style),
    ].filter(Boolean);
    merged.style = parts.length > 0 ? parts.join("; ") : undefined;
  }
  for (const [key, value] of Object.entries(chrono)) {
    const own = consumer[key];
    if (
      /^on[a-z]/.test(key) &&
      typeof value === "function" &&
      typeof own === "function"
    ) {
      merged[key] = (
        event: { defaultPrevented?: boolean } | undefined,
        ...rest: unknown[]
      ) => {
        (own as (...args: unknown[]) => void)(event, ...rest);
        if (!event?.defaultPrevented)
          (value as (...args: unknown[]) => void)(event, ...rest);
      };
    }
  }
  return merged;
}
