// The /calendar subpath import style (the root import is used in app.tsx).
import {
  CalendarAgenda,
  CalendarAgendaDay,
  CalendarMonthGrid,
  CalendarTimeGrid,
  CalendarTimeGridColumnHeader,
  CalendarTimeGridSlot,
} from "@zealakit/chrono-react/calendar";
import type { CSSProperties } from "react";

const weekday = (
  date: { year: number; month: number; day: number },
  width: "short" | "long",
) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: width,
    timeZone: "UTC",
  }).format(Date.UTC(date.year, date.month - 1, date.day));
const shortDate = (date: { year: number; month: number; day: number }) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(Date.UTC(date.year, date.month - 1, date.day));
const hhmm = (time: { hour: number; minute: number }) =>
  `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`;

/** Whichever view is active renders; the others return nothing. */
export function CalendarBody() {
  return (
    <>
      <CalendarMonthGrid className="month" />
      <CalendarTimeGrid className="time-grid">
        {({ days, slots }) => (
          <div style={{ "--cols": days.length } as CSSProperties}>
            <div className="time-row time-head" role="row">
              <span className="time-label" />
              {days.map((day) => (
                <CalendarTimeGridColumnHeader
                  key={day.key}
                  day={day}
                  className="col-head"
                >
                  <small>{weekday(day.date, "short")}</small>
                  {day.date.day}
                </CalendarTimeGridColumnHeader>
              ))}
            </div>
            {slots.map((slot) => (
              <div className="time-row" role="row" key={slot.index}>
                <span className="time-label">
                  {slot.start.minute === 0 ? hhmm(slot.start) : ""}
                </span>
                {days.map((day) => (
                  <CalendarTimeGridSlot
                    key={day.key}
                    slot={slot}
                    day={day}
                    className="slot"
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </CalendarTimeGrid>
      <CalendarAgenda className="agenda">
        {(days) =>
          days.map((day) => (
            <CalendarAgendaDay key={day.key} day={day}>
              <strong>{weekday(day.date, "long")}</strong>
              <span>{shortDate(day.date)}</span>
              <small>No events</small>
            </CalendarAgendaDay>
          ))
        }
      </CalendarAgenda>
    </>
  );
}
