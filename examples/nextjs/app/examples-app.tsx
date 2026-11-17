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
import { useState } from "react";
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

// Static stand-in for "days that have events".
const hasEvents = (date: PlainDate) => date.day % 6 === 0;

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

  return (
    <div className="shell">
      <aside className="sidebar">
        <MiniCalendar
          className="mini"
          now={now}
          locale={locale}
          timeZone="UTC"
          syncWith={range ? { date, visibleRange: range } : undefined}
          isMarked={hasEvents}
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
          <p className="note">
            Events arrive in 0.3.0. These views show the empty structure they
            will fill.
          </p>
        </Calendar>
      </main>
    </div>
  );
}
