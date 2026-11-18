// The root import style (the /calendar subpath is used in render.ts).
import {
  type CustomViews,
  type DateRange,
  type PlainDate,
  type VanillaCalendar,
  createCalendar,
  createMiniCalendar,
  recurrence,
  toPlainDate,
} from "@zealakit/chrono-vanilla";
import { renderCalendar, renderMini } from "./render";
import "./styles.css";

const calendarRoot = document.getElementById("calendar");
const miniRoot = document.getElementById("mini");
if (!calendarRoot || !miniRoot) {
  throw new Error("Example markup is missing #calendar or #mini");
}

// Availability is compiled once per identity, so keep it a module constant (plan 11 R7).
const AVAILABILITY = {
  blocked: [
    { type: "daily", start: "18:00", end: "08:00", reason: "Closed" },
    { type: "daily", start: "12:00", end: "13:00", reason: "Lunch" },
  ],
} as const;

// A custom view is just data (plan 04 C3).
const views: CustomViews = {
  threeDay: { layout: "time-grid", length: { days: 3 }, align: "day" },
};

type AppEvent = {
  id: string;
  start: string;
  end: string;
  allDay?: boolean;
  title: string;
  calendarId?: string;
  rrule?: string;
};

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dt = (d: Date, hour: number, minute = 0) =>
  `${iso(d)}T${pad(hour)}:${pad(minute)}:00`;
const add = (d: Date, days: number) => {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
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
      id: "r1",
      start: dt(add(t0, -14), 9),
      end: dt(add(t0, -14), 9, 15),
      title: "Weekly stand-up",
      calendarId: "work",
      rrule: "FREQ=WEEKLY;COUNT=8",
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

let events = seedEvents();
let moreEvents: AppEvent[] | null = null;
let draft: { start: string; end: string; allDay: boolean } | null = null;

const isMarked = (date: PlainDate) =>
  events.some(
    (event) =>
      event.start.slice(0, 10) ===
      `${date.year}-${pad(date.month)}-${pad(date.day)}`,
  );

let range: DateRange | undefined;
let calendar: VanillaCalendar | undefined;

const dialogs = document.createElement("div");
document.body.append(dialogs);

function dialogOf(title: string, onClose: () => void): HTMLElement {
  const dialog = document.createElement("dialog");
  dialog.open = true;
  dialog.className = "more-dialog";
  const header = document.createElement("header");
  const heading = document.createElement("strong");
  heading.textContent = title;
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "✕";
  close.addEventListener("click", onClose);
  header.append(heading, close);
  dialog.append(header);
  return dialog;
}

function renderDialogs(): void {
  dialogs.replaceChildren();
  if (moreEvents) {
    const dialog = dialogOf("More events", () => {
      moreEvents = null;
      renderDialogs();
    });
    const list = document.createElement("ul");
    for (const event of moreEvents) {
      const item = document.createElement("li");
      item.textContent = event.title;
      list.append(item);
    }
    dialog.append(list);
    dialogs.append(dialog);
  }
  if (draft) {
    const value = draft;
    const dialog = dialogOf("New event", () => {
      draft = null;
      renderDialogs();
    });
    const summary = document.createElement("p");
    summary.textContent = `${value.start} → ${value.end}`;
    const actions = document.createElement("div");
    const save = document.createElement("button");
    save.type = "button";
    save.textContent = "Save";
    save.addEventListener("click", () => {
      events = [
        ...events,
        {
          id: `e${events.length + 1}`,
          start: value.start,
          end: value.end,
          allDay: value.allDay,
          title: value.allDay ? "New all-day" : "New event",
          calendarId: "work",
        },
      ];
      draft = null;
      calendar?.setOptions({ events });
      renderDialogs();
    });
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Cancel";
    cancel.addEventListener("click", () => {
      draft = null;
      renderDialogs();
    });
    actions.append(save, cancel);
    dialog.append(summary, actions);
    dialogs.append(dialog);
  }
}

const mini = createMiniCalendar(miniRoot, {
  isMarked,
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
  events,
  recurrence,
  selectable: true,
  editable: true,
  onEventChange: (proposal) => {
    // Chrono only proposes; the app persists the new times.
    if (proposal.recurrence) return false;
    events = events.map((event) =>
      event.id === proposal.event.id
        ? {
            ...event,
            start: isoValue(proposal.to.start as never),
            end: isoValue(proposal.to.end as never),
            allDay: proposal.to.allDay,
          }
        : event,
    );
    calendar?.setOptions({ events });
    return true;
  },
  eventLimit: "auto",
  availability: AVAILABILITY,
  timeGrid: { start: "06:00", end: "22:00", step: 60 },
  onVisibleRangeChange: (next) => {
    range = next;
    syncMini();
  },
  onDateActivate: (date) => {
    calendar?.setOptions({ selectedDate: date });
    mini.setOptions({ selectedDate: date });
  },
  onMoreActivate: (_date, hidden) => {
    moreEvents = hidden as AppEvent[];
    renderDialogs();
  },
  onSelectRange: (proposal) => {
    draft = {
      start: isoValue(proposal.start as never),
      end: isoValue(proposal.end as never),
      allDay: proposal.allDay,
    };
    renderDialogs();
  },
});
calendar.subscribe(() => {
  if (calendar) renderCalendar(calendarRoot, calendar);
  syncMini();
});
renderCalendar(calendarRoot, calendar);
renderMini(miniRoot, mini);
syncMini();
renderDialogs();
