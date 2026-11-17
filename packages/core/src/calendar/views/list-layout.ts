import { type CalendarDay, visibleDays } from "./day.js";
import type { LayoutContext } from "./month-layout.js";

export type ListLayout = { kind: "list"; days: CalendarDay[] };

/** Agenda: one entry per visible day of the range. Events arrive in stage 3. */
export function getListLayout(ctx: LayoutContext): ListLayout {
  return { kind: "list", days: visibleDays(ctx) };
}
