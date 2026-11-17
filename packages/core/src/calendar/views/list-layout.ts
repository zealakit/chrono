import { dayOfWeek, eachDay, isSameDay } from "../../foundation/index.js";
import { type CalendarDay, makeDay } from "./day.js";
import type { LayoutContext } from "./month-layout.js";

export type ListLayout = { kind: "list"; days: CalendarDay[] };

/** Agenda: one entry per visible day of the range. Events arrive in stage 3. */
export function getListLayout(ctx: LayoutContext): ListLayout {
  const days: CalendarDay[] = [];
  for (const date of eachDay(ctx.range)) {
    const weekday = dayOfWeek(date);
    const day = makeDay(
      {
        date,
        dayOfWeek: weekday,
        outsideMonth: false,
        weekend: ctx.weekInfo.weekend.includes(weekday),
        today: isSameDay(date, ctx.today),
      },
      ctx,
    );
    if (!day.hidden) {
      days.push(day);
    }
  }
  return { kind: "list", days };
}
