// The root import style (the /calendar subpath is used in render.ts).
import {
  type CustomViews,
  type DateRange,
  type PlainDate,
  type VanillaCalendar,
  createCalendar,
  createMiniCalendar,
  toPlainDate,
} from "@zealakit/chrono-vanilla";
import { renderCalendar, renderMini } from "./render";
import "./styles.css";

const calendarRoot = document.getElementById("calendar");
const miniRoot = document.getElementById("mini");
if (!calendarRoot || !miniRoot) {
  throw new Error("Example markup is missing #calendar or #mini");
}

// A custom view is just data (plan 04 C3).
const views: CustomViews = {
  threeDay: { layout: "time-grid", length: { days: 3 }, align: "day" },
};
// Static stand-in for "days that have events".
const hasEvents = (date: PlainDate) => date.day % 6 === 0;

let range: DateRange | undefined;
let calendar: VanillaCalendar | undefined;

const mini = createMiniCalendar(miniRoot, {
  isMarked: hasEvents,
  onNavigate: (date) => {
    calendar?.setOptions({ selectedDate: date });
    mini.setOptions({ selectedDate: date });
    calendar?.controller.goTo(date);
  },
});
mini.subscribe(() => renderMini(miniRoot, mini));

/** The Mini Calendar follows the main calendar (plan 04 C11). */
function syncMini() {
  if (calendar && range) {
    mini.setOptions({
      syncWith: { date: calendar.getState().date, visibleRange: range },
    });
  }
}

calendar = createCalendar(calendarRoot, {
  defaultDate: toPlainDate(
    new Date(),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ),
  views,
  onVisibleRangeChange: (next) => {
    range = next;
    syncMini();
  },
  onDateActivate: (date) => {
    calendar?.setOptions({ selectedDate: date });
    mini.setOptions({ selectedDate: date });
  },
});
calendar.subscribe(() => {
  if (calendar) renderCalendar(calendarRoot, calendar);
  syncMini();
});
renderCalendar(calendarRoot, calendar);
renderMini(miniRoot, mini);
syncMini();
