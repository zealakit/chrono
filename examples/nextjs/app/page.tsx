// A Server Component: it calls Chrono utilities during the server render, from both entry styles.
import {
  expandRecurrence,
  getCalendarTitle,
  getRange,
} from "@zealakit/chrono-react/calendar";
import {
  getVisibleRange,
  toIsoString,
  toPlainDate,
  type ViewDefinition,
} from "@zealakit/chrono-react";
import { ExamplesApp } from "./examples-app";

const LOCALE = "en-US";
const MONTH: ViewDefinition = {
  id: "month",
  layout: "month",
  length: { months: 1 },
  align: "month",
};

export default function Page() {
  // Chosen on the server and passed down, so server and client render the same markup.
  const now = Date.now();
  const anchor = toPlainDate(new Date(now), "UTC");
  const range = getRange(MONTH, anchor, { weekStartsOn: 1 });
  const visible = getVisibleRange(MONTH, range, { weekStartsOn: 1 });
  const title = getCalendarTitle(range, MONTH, LOCALE);
  // A series expanded on the server, with the same pure engine the client pack uses.
  const series = expandRecurrence(
    {
      id: "server-series",
      title: "Weekly review",
      start: `${toIsoString(anchor)}T09:00:00`,
      end: `${toIsoString(anchor)}T09:30:00`,
      rrule: "FREQ=WEEKLY;COUNT=8",
    },
    visible,
    { timeZone: "UTC" },
  );

  return (
    <>
      <p className="note" data-server-title>
        Rendered on the server: {title.text} ({toIsoString(visible.start)} to{" "}
        {toIsoString(visible.end)})
      </p>
      <p className="note" data-server-recurrence>
        Server-expanded series:{" "}
        {series
          .slice(0, 3)
          .map((occurrence) => toIsoString(occurrence.start))
          .join(", ")}
      </p>
      <ExamplesApp now={now} locale={LOCALE} />
    </>
  );
}
