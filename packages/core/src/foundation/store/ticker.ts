/**
 * A minute-aligned ticker (plan 05 E19). A `setTimeout` chain, no DOM. The
 * controller starts it only when the app does not inject `now`.
 */
export type Ticker = {
  start(nowMs: number): void;
  stop(): void;
  /** Whether the ticker is currently scheduled. */
  running(): boolean;
};

export function createTicker(callback: (nowMs: number) => void): Ticker {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const tick = (): void => {
    const now = Date.now();
    callback(now);
    // Re-align to the next minute boundary so timer latency never accumulates.
    timer = setTimeout(tick, 60_000 - (now % 60_000));
  };

  return {
    start(nowMs) {
      if (timer !== undefined) {
        return;
      }
      const next = Math.ceil(nowMs / 60_000) * 60_000;
      timer = setTimeout(tick, Math.max(0, next - nowMs));
    },
    stop() {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
    },
    running() {
      return timer !== undefined;
    },
  };
}
