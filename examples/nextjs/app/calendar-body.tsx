// The /calendar subpath import style (the root import is used in examples-app.tsx).
import {
  CalendarAgenda,
  CalendarAgendaDay,
  CalendarAllDayRow,
  CalendarEvent,
  CalendarEventDragPreview,
  CalendarEventResizeHandle,
  CalendarEvents,
  CalendarMonthGrid,
  CalendarMoreButton,
  CalendarNowIndicator,
  CalendarSelectionPreview,
  CalendarTimeGrid,
  CalendarTimeGridColumnHeader,
  CalendarTimeGridSlot,
  type CalendarEventsValue,
} from "@zealakit/chrono-react/calendar";
import type { CSSProperties } from "react";

const weekday = (
  date: { year: number; month: number; day: number },
  width: "short" | "long",
  locale: string,
) =>
  new Intl.DateTimeFormat(locale, { weekday: width, timeZone: "UTC" }).format(
    Date.UTC(date.year, date.month - 1, date.day),
  );
const shortDate = (
  date: { year: number; month: number; day: number },
  locale: string,
) =>
  new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(Date.UTC(date.year, date.month - 1, date.day));
const hhmm = (time: { hour: number; minute: number }) =>
  `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`;

type AppEvent = {
  id: string;
  start: string;
  end: string;
  allDay?: boolean;
  title: string;
  calendarId?: string;
};
type Segment = CalendarEventsValue[number];

function Chip({ segment }: { segment: Segment }) {
  return (
    <span className="event-chip" data-calendar-id={segment.event.calendarId}>
      {!segment.allDay ? <small>{hhmm(segment.start)} </small> : null}
      {(segment.event as AppEvent).title}
    </span>
  );
}

function Block({ segment }: { segment: Segment }) {
  return (
    <span className="event-block" data-calendar-id={segment.event.calendarId}>
      <CalendarEventResizeHandle
        segment={segment}
        edge="start"
        className="resize-handle"
      />
      {(segment.event as AppEvent).title}
      <CalendarEventResizeHandle
        segment={segment}
        edge="end"
        className="resize-handle"
      />
    </span>
  );
}

/** Whichever view is active renders; the others return nothing. */
/** `locale` is passed down so the server and the client format the same way. */
export function CalendarBody({ locale }: { locale: string }) {
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
                    <Chip segment={segment} />
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
                  {days.map((day) => (
                    <CalendarEventDragPreview
                      key={day.key}
                      day={day}
                      allDay
                      className="drag-preview"
                    />
                  ))}
                  {segments.map((segment) => (
                    <CalendarEvent key={segment.key} segment={segment}>
                      <Block segment={segment} />
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
                  <small>{weekday(day.date, "short", locale)}</small>
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
                            <Block segment={segment} />
                          </CalendarEvent>
                        ))
                      }
                    </CalendarEvents>
                    <CalendarSelectionPreview day={day} />
                    <CalendarEventDragPreview
                      day={day}
                      className="drag-preview"
                    />
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
                <strong>{weekday(day.date, "long", locale)}</strong>
                <span>{shortDate(day.date, locale)}</span>
              </div>
              <CalendarEvents day={day}>
                {(segments) =>
                  segments.length > 0 ? (
                    <ul className="agenda-events">
                      {segments.map((segment) => (
                        <li key={segment.key}>
                          <CalendarEvent segment={segment}>
                            <Chip segment={segment} />
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
