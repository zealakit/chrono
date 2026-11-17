import type { KeyboardEvent } from "react";

/** Modifier keys of a React keyboard event, as the controllers want them. */
export const modifiersOf = (event: KeyboardEvent) => ({
  shift: event.shiftKey,
  ctrl: event.ctrlKey,
  meta: event.metaKey,
});
