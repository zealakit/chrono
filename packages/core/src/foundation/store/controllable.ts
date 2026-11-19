export type ControllableOptions<T> = {
  /** Controlled when not `undefined`. */
  value?: T;
  defaultValue: T;
  onChange?: (value: T) => void;
  /** Suppresses change events for equal values (`isSameDay`, ...). */
  equals?: (a: T, b: T) => boolean;
};

export type Controllable<T> = {
  get(): T;
  /** Request a new value. Controlled: only calls `onChange`. Uncontrolled: stores it, then calls `onChange`. */
  set(next: T): void;
  isControlled(): boolean;
  /** Re-sync with the latest props. Notifies subscribers when the visible value changed. */
  sync(options: Partial<Omit<ControllableOptions<T>, "defaultValue">>): void;
  subscribe(listener: (value: T) => void): () => void;
};

/** The controlled / uncontrolled convention of plan 02 §2.3. */
export function createControllable<T>(
  options: ControllableOptions<T>,
): Controllable<T> {
  let value = options.value;
  let onChange = options.onChange;
  let equals = options.equals ?? Object.is;
  let internal = options.defaultValue;
  const listeners = new Set<(value: T) => void>();

  const current = (): T => (value !== undefined ? value : internal);
  const notify = (): void => {
    const visible = current();
    for (const listener of [...listeners]) {
      listener(visible);
    }
  };

  return {
    get: current,
    isControlled: () => value !== undefined,
    set(next) {
      if (equals(current(), next)) {
        return;
      }
      if (value === undefined) {
        internal = next;
        notify();
      }
      onChange?.(next);
    },
    sync(next) {
      const before = current();
      if ("value" in next) {
        value = next.value;
      }
      if ("onChange" in next) {
        onChange = next.onChange;
      }
      if (next.equals) {
        equals = next.equals;
      }
      if (!equals(before, current())) {
        notify();
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
