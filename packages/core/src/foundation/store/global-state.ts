/**
 * State shared by every copy of Core loaded on a page.
 *
 * Each adapter ships its own bundled copy of Core, so module-level variables
 * would split per adapter. State that must stay page-global lives on
 * `globalThis` under a versioned `Symbol.for` key. Bump the version when a
 * stored shape changes so incompatible copies never read each other's state.
 *
 * SSR-safe: only `globalThis` is touched, and state is created lazily.
 */
const STATE_VERSION = 1;

export function getGlobalState<T>(name: string, create: () => T): T {
  const key = Symbol.for(`@zealakit/chrono-core/v${STATE_VERSION}/${name}`);
  const store = globalThis as unknown as Record<symbol, T | undefined>;
  let value = store[key];
  if (value === undefined) {
    value = create();
    store[key] = value;
  }
  return value;
}
