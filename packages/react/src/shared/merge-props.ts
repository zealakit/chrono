type Props = Record<string, unknown>;

/**
 * Merge a consumer's props with Chrono's. Chrono wins on contract attributes
 * (ARIA and `data-*`); `className` and `style` stay the consumer's (Chrono
 * sets neither); handlers run the consumer's first, then Chrono's unless the
 * consumer called `preventDefault()`.
 */
export function mergeProps(consumer: Props, chrono: Props): Props {
  const merged: Props = { ...consumer, ...chrono };
  // `className` stays the consumer's (Chrono sets none).
  if ("className" in consumer) merged.className = consumer.className;
  // `style` merges the consumer's styles with Chrono's `--chrono-*` layout
  // properties (plan 05 R2); Chrono's properties win on their own keys.
  if ("style" in consumer || "style" in chrono) {
    merged.style = {
      ...(consumer.style as object),
      ...(chrono.style as object),
    };
  }
  for (const [key, value] of Object.entries(chrono)) {
    const own = consumer[key];
    if (
      /^on[A-Z]/.test(key) &&
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
