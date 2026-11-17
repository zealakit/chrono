// The /calendar subpath import style (the root import is used in app.tsx).
import {
  CalendarAgenda,
  CalendarAgendaDay,
  CalendarAllDayRow,
  CalendarEvent,
  CalendarEvents,
  CalendarMonthGrid,
  CalendarMoreButton,
  CalendarNowIndicator,
  CalendarSelectionPreview,
  CalendarTimeGrid,
  CalendarTimeGridColumnHeader,
  CalendarTimeGridSlot,
} from "@zealakit/chrono-react/calendar";
import type { CSSProperties } from "react";
import type { AppEvent } from "./app";

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

function EventChip({ event }: { event: AppEvent }) {
  return (
    <span className="event-chip" data-calendar-id={event.calendarId}>
      {!event.allDay && (
        <small>
          {String((event.start as unknown as { hour: number }).hour).padStart(
            2,
            "0",
          )}
          :
          {String(
            (event.start as unknown as { minute: number }).minute,
          ).padStart(2, "0")}{" "}
        </small>
      )}
      {event.title}
    </span>
  );
}

function EventBlock({ event }: { event: AppEvent }) {
  return (
    <span className="event-block" data-calendar-id={event.calendarId}>
      {event.title}
    </span>
  );
}

/** Whichever view is active renders; the others return nothing. */
export function CalendarBody() {
  return (
    <>
      <CalendarMonthGrid className="month">
        {(day) => (
          <>
            <span className="day-num">{day.date.day}</span>
            <CalendarEvents day={day}>
              {(segments) =>
                segments.map((segment) => (
                  <CalendarEvent key={segment.key} segment={segment}>
                    <EventChip event={segment.event as AppEvent} />
                  </CalendarEvent>
                ))
              }
            </CalendarEvents>
            <CalendarMoreButton day={day} />
          </>
        )}
      </CalendarMonthGrid>

      <CalendarTimeGrid className="time-grid">
        {({ days, slots }) => (
          <div style={{ "--cols": days.length } as CSSProperties}>
            <CalendarAllDayRow>
              {({ segments }) => (
                <div className="all-day-row">
                  {segments.map((segment) => (
                    <CalendarEvent key={segment.key} segment={segment}>
                      <EventBlock event={segment.event as AppEvent} />
                    </CalendarEvent>
                  ))}
                </div>
              )}
            </CalendarAllDayRow>
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
            <div className="time-body">
              <div className="time-slots">
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
              <div className="time-events">
                {days.map((day) => (
                  <div className="day-col" key={day.key}>
                    <CalendarEvents day={day}>
                      {(segments) =>
                        segments.map((segment) => (
                          <CalendarEvent key={segment.key} segment={segment}>
                            <EventBlock event={segment.event as AppEvent} />
                          </CalendarEvent>
                        ))
                      }
                    </CalendarEvents>
                    <CalendarSelectionPreview day={day} />
                  </div>
                ))}
                <CalendarNowIndicator className="now-indicator" />
              </div>
            </div>
          </div>
        )}
      </CalendarTimeGrid>

      <CalendarAgenda className="agenda">
        {(days) =>
          days.map((day) => (
            <CalendarAgendaDay key={day.key} day={day}>
              <div className="agenda-head">
                <strong>{weekday(day.date, "long")}</strong>
                <span>{shortDate(day.date)}</span>
              </div>
              <CalendarEvents day={day}>
                {(segments) =>
                  segments.length > 0 ? (
                    <ul className="agenda-events">
                      {segments.map((segment) => (
                        <li key={segment.key}>
                          <CalendarEvent segment={segment}>
                            <EventChip event={segment.event as AppEvent} />
                          </CalendarEvent>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <small className="agenda-empty">No events</small>
                  )
                }
              </CalendarEvents>
            </CalendarAgendaDay>
          ))
        }
      </CalendarAgenda>
    </>
  );
}
