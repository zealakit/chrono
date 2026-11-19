export type Store<T extends object> = {
  get(): T;
  set(update: Partial<T> | ((state: T) => Partial<T>)): void;
  subscribe(listener: (state: T) => void): () => void;
};

/** Synchronous state container. Skips notifying when nothing changed (shallow compare). */
export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<(state: T) => void>();
  return {
    get: () => state,
    set(update) {
      const patch = typeof update === "function" ? update(state) : update;
      const keys = Object.keys(patch) as (keyof T)[];
      if (keys.every((key) => Object.is(state[key], patch[key]))) {
        return;
      }
      state = { ...state, ...patch };
      for (const listener of [...listeners]) {
        listener(state);
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
