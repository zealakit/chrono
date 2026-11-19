"use client";

// The root import style (the /calendar subpath is used in calendar-body.tsx).
import {
  Calendar,
  CalendarNextButton,
  CalendarPrevButton,
  CalendarTitle,
  CalendarTodayButton,
  CalendarViewButton,
  type CustomViews,
  type DateRange,
  MiniCalendar,
  MiniCalendarGrid,
  MiniCalendarNextButton,
  MiniCalendarPrevButton,
  MiniCalendarTitle,
  type PlainDate,
  toPlainDate,
} from "@zealakit/chrono-react";
import { useMemo, useState } from "react";
import { CalendarBody } from "./calendar-body";

const VIEWS = [
  ["month", "Month"],
  ["week", "Week"],
  ["workWeek", "Work week"],
  ["day", "Day"],
  ["agenda", "Agenda"],
  ["threeDay", "3 days"],
] as const;

// A custom view is just data (plan 04 C3).
const CUSTOM_VIEWS: CustomViews = {
  threeDay: { layout: "time-grid", length: { days: 3 }, align: "day" },
};

type AppEvent = {
  id: string;
  start: string;
  end: string;
  allDay?: boolean;
  title: string;
  calendarId?: string;
};

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const at = (base: Date, days: number, hour = 0, minute = 0) => {
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + days);
  return { date: iso(next), hour, minute };
};
const stamp = (value: { date: string; hour: number; minute: number }) =>
  `${value.date}T${pad(value.hour)}:${pad(value.minute)}:00`;

/** Seed events around the server-provided `now`, so server and client render the same. */
function seedEvents(now: number): AppEvent[] {
  const base = new Date(now);
  const today = { date: iso(base), hour: 0, minute: 0 };
  return [
    {
      id: "e1",
      start: today.date,
      end: iso(new Date(now + 86_400_000)),
      allDay: true,
      title: "Company holiday",
      calendarId: "personal",
    },
    {
      id: "e2",
      start: stamp(at(base, 0, 9)),
      end: stamp(at(base, 0, 10)),
      title: "Daily stand-up",
      calendarId: "work",
    },
    {
      id: "e3",
      start: stamp(at(base, 0, 9, 30)),
      end: stamp(at(base, 0, 10, 30)),
      title: "Design review",
      calendarId: "work",
    },
    {
      id: "e4",
      start: stamp(at(base, 0, 11)),
      end: stamp(at(base, 0, 12)),
      title: "1:1 with Ana",
      calendarId: "work",
    },
    {
      id: "e5",
      start: stamp(at(base, 0, 13)),
      end: stamp(at(base, 0, 14)),
      title: "Lunch",
      calendarId: "personal",
    },
    {
      id: "e6",
      start: stamp(at(base, 0, 15)),
      end: stamp(at(base, 0, 16, 30)),
      title: "Planning",
      calendarId: "work",
    },
    {
      id: "e7",
      start: stamp(at(base, 1, 10)),
      end: stamp(at(base, 2, 10)),
      title: "Off-site (2 days)",
      calendarId: "work",
    },
    {
      id: "e8",
      start: stamp(at(base, 0, 12)),
      end: stamp(at(base, 0, 12, 5)),
      title: "Reminder",
      calendarId: "personal",
    },
  ];
}

/** A selection value as ISO; timed values keep their time (plan 05 E14). */
const isoValue = (
  value:
    | string
    | {
        year: number;
        month: number;
        day: number;
        hour?: number;
        minute?: number;
        second?: number;
      },
): string => {
  if (typeof value === "string") return value;
  const date = `${value.year}-${pad(value.month)}-${pad(value.day)}`;
  if (value.hour === undefined) return date;
  return `${date}T${pad(value.hour)}:${pad(value.minute ?? 0)}:${pad(value.second ?? 0)}`;
};

type AppProps = {
  /** Epoch milliseconds from the server, so the first client render equals the server render. */
  now: number;
  locale: string;
};

export function ExamplesApp({ now, locale }: AppProps) {
  const [view, setView] = useState("month");
  const [date, setDate] = useState<PlainDate>(() =>
    toPlainDate(new Date(now), "UTC"),
  );
  const [selected, setSelected] = useState<PlainDate>();
  const [range, setRange] = useState<DateRange>();
  const [events, setEvents] = useState<AppEvent[]>(() => seedEvents(now));
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [moreEvents, setMoreEvents] = useState<AppEvent[] | null>(null);
  const [draft, setDraft] = useState<{
    start: string;
    end: string;
    allDay: boolean;
  } | null>(null);

  const busy = useMemo(
    () => new Set(events.map((event) => event.start.slice(0, 10))),
    [events],
  );
  const isMarked = (day: PlainDate) =>
    busy.has(`${day.year}-${pad(day.month)}-${pad(day.day)}`);

  return (
    <div className="shell">
      <aside className="sidebar">
        <MiniCalendar
          className="mini"
          now={now}
          locale={locale}
          timeZone="UTC"
          syncWith={range ? { date, visibleRange: range } : undefined}
          isMarked={isMarked}
          selectedDate={selected}
          onNavigate={(next) => {
            setDate(next);
            setSelected(next);
          }}
        >
          <div className="mini-head">
            <MiniCalendarPrevButton>‹</MiniCalendarPrevButton>
            <MiniCalendarTitle />
            <MiniCalendarNextButton>›</MiniCalendarNextButton>
          </div>
          <MiniCalendarGrid />
        </MiniCalendar>
      </aside>
      <main className="main">
        <Calendar
          now={now}
          locale={locale}
          timeZone="UTC"
          view={view}
          onViewChange={setView}
          date={date}
          onDateChange={setDate}
          onVisibleRangeChange={setRange}
          onDateActivate={setSelected}
          views={CUSTOM_VIEWS}
          selectedDate={selected}
          events={events}
          selectable
          editable
          onEventChange={(proposal) => {
            // Chrono only proposes; the app persists the new times.
            setEvents((current) =>
              current.map((event) =>
                event.id === proposal.event.id
                  ? {
                      ...event,
                      start: isoValue(proposal.to.start as never),
                      end: isoValue(proposal.to.end as never),
                      allDay: proposal.to.allDay,
                    }
                  : event,
              ),
            );
            return true;
          }}
          eventLimit="auto"
          timeGrid={{ start: "06:00", end: "22:00", step: 60 }}
          selectedEventId={selectedEventId}
          onSelectedEventChange={(id) =>
            setSelectedEventId(typeof id === "number" ? String(id) : id)
          }
          onMoreActivate={(_date, hidden) =>
            setMoreEvents(hidden as AppEvent[])
          }
          onSelectRange={(proposal) =>
            setDraft({
              start: isoValue(proposal.start as never),
              end: isoValue(proposal.end as never),
              allDay: proposal.allDay,
            })
          }
        >
          <div className="toolbar">
            <CalendarPrevButton>‹</CalendarPrevButton>
            <CalendarTodayButton />
            <CalendarNextButton>›</CalendarNextButton>
            <CalendarTitle />
            <div className="views">
              {VIEWS.map(([id, label]) => (
                <CalendarViewButton key={id} view={id}>
                  {label}
                </CalendarViewButton>
              ))}
            </div>
          </div>
          <CalendarBody locale={locale} />
        </Calendar>
      </main>

      {moreEvents ? (
        <dialog
          open
          className="more-dialog"
          onClose={() => setMoreEvents(null)}
        >
          <header>
            <strong>More events</strong>
            <button type="button" onClick={() => setMoreEvents(null)}>
              ✕
            </button>
          </header>
          <ul>
            {moreEvents.map((event) => (
              <li key={event.id}>{event.title}</li>
            ))}
          </ul>
        </dialog>
      ) : null}

      {draft ? (
        <dialog open className="more-dialog" onClose={() => setDraft(null)}>
          <header>
            <strong>New event</strong>
            <button type="button" onClick={() => setDraft(null)}>
              ✕
            </button>
          </header>
          <p>
            {draft.start} → {draft.end}
          </p>
          <div>
            <button
              type="button"
              onClick={() => {
                setEvents((current) => [
                  ...current,
                  {
                    id: `e${current.length + 1}`,
                    start: draft.start,
                    end: draft.end,
                    allDay: draft.allDay,
                    title: draft.allDay ? "New all-day" : "New event",
                    calendarId: "work",
                  },
                ]);
                setDraft(null);
              }}
            >
              Save
            </button>
            <button type="button" onClick={() => setDraft(null)}>
              Cancel
            </button>
          </div>
        </dialog>
      ) : null}
    </div>
  );
}
