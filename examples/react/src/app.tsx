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
  type EventChangeProposal,
  MiniCalendar,
  MiniCalendarGrid,
  MiniCalendarNextButton,
  MiniCalendarPrevButton,
  MiniCalendarTitle,
  type PlainDate,
  type RecurrenceScope,
  applyRecurrenceChange,
  recurrence,
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

// Availability is compiled once per identity, so keep it a module constant (plan 11 R7).
const AVAILABILITY = {
  blocked: [
    { type: "daily", start: "18:00", end: "08:00", reason: "Closed" },
    { type: "daily", start: "12:00", end: "13:00", reason: "Lunch" },
  ],
} as const;

// A custom view is just data (plan 04 C3).
const CUSTOM_VIEWS: CustomViews = {
  threeDay: { layout: "time-grid", length: { days: 3 }, align: "day" },
};

export type AppEvent = {
  id: string;
  start: string;
  end: string;
  allDay?: boolean;
  title: string;
  calendarId?: string;
  rrule?: string;
  recurringId?: string;
  recurrenceId?: string;
};

const iso = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const dt = (d: Date, hour: number, minute = 0) =>
  `${iso(d)}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
const add = (d: Date, days: number) => {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
};
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * A selection value as an ISO string. Timed values keep their time (a date-only
 * string with `allDay: false` would be rejected by Chrono, which expects a
 * date-time); all-day values stay date-only.
 */
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
  if (typeof value === "string") {
    return value;
  }
  const date = `${value.year}-${pad(value.month)}-${pad(value.day)}`;
  if (value.hour === undefined) {
    return date;
  }
  return `${date}T${pad(value.hour)}:${pad(value.minute ?? 0)}:${pad(value.second ?? 0)}`;
};

function seedEvents(): AppEvent[] {
  const today = new Date();
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return [
    {
      id: "e1",
      start: iso(t0),
      end: iso(add(t0, 1)),
      allDay: true,
      title: "Company holiday",
      calendarId: "personal",
    },
    {
      id: "e2",
      start: dt(t0, 9),
      end: dt(t0, 10),
      title: "Daily stand-up",
      calendarId: "work",
    },
    {
      id: "e3",
      start: dt(t0, 9, 30),
      end: dt(t0, 10, 30),
      title: "Design review",
      calendarId: "work",
    },
    {
      id: "e4",
      start: dt(t0, 11),
      end: dt(t0, 12),
      title: "1:1 with Ana",
      calendarId: "work",
    },
    {
      id: "e5",
      start: dt(t0, 13),
      end: dt(t0, 14),
      title: "Lunch",
      calendarId: "personal",
    },
    {
      id: "e6",
      start: dt(t0, 15),
      end: dt(t0, 16, 30),
      title: "Planning",
      calendarId: "work",
    },
    {
      id: "e7",
      start: dt(add(t0, 1), 10),
      end: dt(add(t0, 2), 10),
      title: "Off-site (2 days)",
      calendarId: "work",
    },
    {
      id: "e8",
      start: dt(t0, 12),
      end: dt(t0, 12, 5),
      title: "Reminder",
      calendarId: "personal",
    },
    {
      id: "r1",
      start: dt(add(t0, -14), 9),
      end: dt(add(t0, -14), 9, 15),
      title: "Weekly stand-up",
      calendarId: "work",
      rrule: "FREQ=WEEKLY;COUNT=8",
    },
    {
      id: "r1-moved",
      start: dt(add(t0, -7), 10),
      end: dt(add(t0, -7), 10, 15),
      title: "Weekly stand-up (moved)",
      calendarId: "work",
      recurringId: "r1",
      recurrenceId: dt(add(t0, -7), 9),
    },
  ];
}

// Days the Mini Calendar marks as "has events".

export function App() {
  const [view, setView] = useState("month");
  const [date, setDate] = useState<PlainDate>(() =>
    toPlainDate(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone),
  );
  const [selected, setSelected] = useState<PlainDate>();
  const [range, setRange] = useState<DateRange>();
  const [events, setEvents] = useState<AppEvent[]>(() => seedEvents());
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  // Events hidden behind "+N more", for the dialog.
  const [moreEvents, setMoreEvents] = useState<AppEvent[] | null>(null);
  // The last created selection, to build a new event from it.
  const [draft, setDraft] = useState<{
    start: string;
    end: string;
    allDay: boolean;
  } | null>(null);
  // A recurring drag waits for the this/following/all choice.
  const [change, setChange] = useState<EventChangeProposal<AppEvent> | null>(
    null,
  );

  const applyScope = (scope: RecurrenceScope) => {
    const current = change;
    const series = current?.recurrence?.series;
    if (!current || !series) return;
    const result = applyRecurrenceChange(series, current, scope, {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    setEvents((prev) => [
      ...prev.filter((event) => event.id !== series.id),
      ...(result.series ? [result.series] : []),
      ...(result.newSeries
        ? [{ ...result.newSeries, id: `series-${Date.now()}` }]
        : []),
      ...(result.override
        ? [
            {
              ...(result.override as unknown as AppEvent),
              id: `override-${Date.now()}`,
            },
          ]
        : []),
    ]);
    setChange(null);
  };

  const busy = useMemo(() => {
    const days = new Set<string>();
    for (const event of events) days.add(event.start.slice(0, 10));
    return days;
  }, [events]);

  const addEvent = () => {
    if (!draft) return;
    const next: AppEvent = {
      id: `e${events.length + 1}`,
      start: draft.start,
      end: draft.end,
      allDay: draft.allDay,
      title: draft.allDay ? "New all-day" : "New event",
      calendarId: "work",
    };
    setEvents((prev) => [...prev, next]);
    setDraft(null);
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <MiniCalendar
          className="mini"
          syncWith={range ? { date, visibleRange: range } : undefined}
          isMarked={(day) =>
            busy.has(
              `${day.year}-${String(day.month).padStart(2, "0")}-${String(day.day).padStart(2, "0")}`,
            )
          }
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
          view={view}
          onViewChange={setView}
          date={date}
          onDateChange={setDate}
          onVisibleRangeChange={setRange}
          onDateActivate={setSelected}
          views={CUSTOM_VIEWS}
          selectedDate={selected}
          events={events}
          recurrence={recurrence}
          editable
          onEventChange={(proposal) => {
            if (proposal.recurrence) setChange(proposal);
            return false;
          }}
          selectable
          eventLimit="auto"
          timeGrid={{ start: "06:00", end: "22:00", step: 60 }}
          availability={AVAILABILITY}
          selectedEventId={selectedEventId}
          onSelectedEventChange={(id) =>
            setSelectedEventId(id as string | null)
          }
          onMoreActivate={(_date, hidden) =>
            setMoreEvents(hidden as AppEvent[])
          }
          onSelectRange={(proposal) =>
            setDraft({
              start: isoValue(proposal.start),
              end: isoValue(proposal.end),
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
          <CalendarBody />
        </Calendar>
      </main>

      {moreEvents && (
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
      )}

      {change?.recurrence && (
        <dialog open className="more-dialog" onClose={() => setChange(null)}>
          <header>
            <strong>Change recurring event</strong>
            <button type="button" onClick={() => setChange(null)}>
              ✕
            </button>
          </header>
          <p>{change.event.title}</p>
          <div>
            <button type="button" onClick={() => applyScope("this")}>
              This event
            </button>
            <button type="button" onClick={() => applyScope("following")}>
              This and following
            </button>
            <button type="button" onClick={() => applyScope("all")}>
              All events
            </button>
            <button type="button" onClick={() => setChange(null)}>
              Cancel
            </button>
          </div>
        </dialog>
      )}

      {draft && (
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
            <button type="button" onClick={addEvent}>
              Save
            </button>
            <button type="button" onClick={() => setDraft(null)}>
              Cancel
            </button>
          </div>
        </dialog>
      )}
    </div>
  );
}
