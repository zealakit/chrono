/** The Svelte store contract: `subscribe` calls `run` with the current value, then on every change. */
export type Readable<T> = { subscribe(run: (value: T) => void): () => void };
