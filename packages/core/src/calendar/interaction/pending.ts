import type { CalendarEventInput, NormalizedEvent } from "../events/types.js";
import { type EditValue, toSeconds } from "./drag-geometry.js";

/** A change the app has accepted but `events` does not show yet (plan 09 M3). */
export type PendingChange = {
  /** The normalized event key. */
  eventKey: string;
  eventId: string | number;
  to: EditValue;
};

const same = (a: EditValue, b: EditValue): boolean =>
  a.allDay === b.allDay &&
  toSeconds(a.start) === toSeconds(b.start) &&
  toSeconds(a.end) === toSeconds(b.end);

/**
 * A pending change is resolved when the incoming events show the event at the new
 * position (zoned values compare by instant: they are already display wall time), or
 * when the event is gone.
 */
export function isResolved<T extends CalendarEventInput>(
  change: PendingChange,
  incoming: readonly NormalizedEvent<T>[],
): boolean {
  const found = incoming.find((event) => event.id === change.eventId);
  return !found || same(change.to, found);
}

/** The pending changes that remain after `incoming` arrived. */
export function unresolved<T extends CalendarEventInput>(
  pending: readonly PendingChange[],
  incoming: readonly NormalizedEvent<T>[],
): PendingChange[] {
  return pending.filter((change) => !isResolved(change, incoming));
}
