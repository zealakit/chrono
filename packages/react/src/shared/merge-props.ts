type Props = Record<string, unknown>;

/**
 * Merge a consumer's props with Chrono's. Chrono wins on contract attributes
 * (ARIA and `data-*`); `className` and `style` stay the consumer's (Chrono
 * sets neither); handlers run the consumer's first, then Chrono's unless the
 * consumer called `preventDefault()`.
 */
export function mergeProps(consumer: Props, chrono: Props): Props {
  const merged: Props = { ...consumer, ...chrono };
  for (const key of ["className", "style"]) {
    if (key in consumer) merged[key] = consumer[key];
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
