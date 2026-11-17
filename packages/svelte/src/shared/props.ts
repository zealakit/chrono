import {
  type Attributes,
  normalizeAttributes,
} from "@zealakit/chrono-core/foundation";

export type Props = Record<string, unknown>;

/** Core attribute record to element props: strings only. */
export const toProps = (attributes: Attributes): Record<string, string> =>
  normalizeAttributes(attributes);

export const modifiersOf = (event: KeyboardEvent) => ({
  shift: event.shiftKey,
  ctrl: event.ctrlKey,
  meta: event.metaKey,
});

/**
 * Merge a consumer's props with Chrono's. Chrono wins on contract attributes
 * (ARIA and `data-*`); `class` and `style` stay the consumer's; handlers run the
 * consumer's first, then Chrono's unless the consumer called `preventDefault()`.
 */
export function mergeProps(consumer: Props, chrono: Props): Props {
  const merged: Props = { ...consumer, ...chrono };
  for (const key of ["class", "style"]) {
    if (key in consumer) merged[key] = consumer[key];
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
