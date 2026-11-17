import { getGlobalState } from "./global-state.js";

/** A page-wide counter; adapters pass framework ids for SSR instead. */
export function createId(prefix: string): string {
  const state = getGlobalState("ids", () => ({ count: 0 }));
  state.count += 1;
  return `${prefix}-${state.count}`;
}
