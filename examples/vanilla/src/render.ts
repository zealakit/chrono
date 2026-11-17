// The /calendar subpath import style (the root import is used in main.ts).
// Vanilla is controller-only: any templating works. This one builds DOM by hand
// and stamps the controller's attribute records with `applyAttributes`.
import {
  type Attributes,
  type CalendarDay,
  type CalendarEventsValue,
  type VanillaCalendar,
  type VanillaMiniCalendar,
  applyAttributes,
} from "@zealakit/chrono-vanilla/calendar";

export const VIEWS = [
  ["month", "Month"],
  ["week", "Week"],
  ["workWeek", "Work week"],
  ["day", "Day"],
  ["agenda", "Agenda"],
  ["threeDay", "3 days"],
] as const;

type Day = { year: number; month: number; day: number };
type AppEvent = { id: string; title?: string; calendarId?: string };
type Segment = CalendarEventsValue[number];

const weekday = (date: Day, width: "short" | "long") =>
  new Intl.DateTimeFormat(undefined, {
    weekday: width,
    timeZone: "UTC",
  }).format(Date.UTC(date.year, date.month - 1, date.day));
const shortDate = (date: Day) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(Date.UTC(date.year, date.month - 1, date.day));
const hhmm = (time: { hour: number; minute: number }) =>
  `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`;

function el(
  tag: string,
  attributes: Attributes | undefined,
  className: string | undefined,
  ...children: (Node | string | null)[]
): HTMLElement {
  const element = document.createElement(tag);
  if (attributes) applyAttributes(element, attributes);
  if (className) element.className = className;
  for (const child of children) if (child !== null) element.append(child);
  return element;
}

/** Buttons carry `data-chrono-action`: the delegated listener finds them by it. */
function actionButton(
  attributes: Attributes,
  action: string,
  label: string,
): HTMLElement {
  const button = el("button", attributes, undefined, label);
  button.dataset.chronoAction = action;
  return button;
}

function chip(segment: Segment): HTMLElement {
  const event = segment.event as AppEvent;
  const wrapper = el("span", undefined, "event-chip");
  if (event.calendarId) wrapper.dataset.calendarId = event.calendarId;
  if (!segment.allDay) {
    wrapper.append(el("small", undefined, undefined, hhmm(segment.start)));
  }
  wrapper.append(event.title ?? "");
  return wrapper;
}

/** One cell's event list (E11): a `role="group"` wrapper with the segments. */
function eventsOf(
  controller: VanillaCalendar["controller"],
  state: ReturnType<VanillaCalendar["getState"]>,
  day: { key: string },
): HTMLElement {
  return el(
    "div",
    { role: "group", "aria-label": state.messages.events },
    undefined,
    ...controller
      .getCellEventSegments(day)
      .map((segment) =>
        el(
          "div",
          controller.getEventAttributes(segment),
          undefined,
          chip(segment),
        ),
      ),
  );
}

function moreOf(
  controller: VanillaCalendar["controller"],
  state: ReturnType<VanillaCalendar["getState"]>,
  day: CalendarDay,
): HTMLElement | null {
  const overflow = state.more.find((entry) => entry.dayKey === day.key);
  if (!overflow) return null;
  return el(
    "button",
    controller.getMoreAttributes(day),
    undefined,
    `+${overflow.count} more`,
  );
}

export function renderCalendar(
  root: HTMLElement,
  calendar: VanillaCalendar,
): void {
  const { controller } = calendar;
  const state = calendar.getState();
  const { layout } = state;
  applyAttributes(root, controller.getRootAttributes());

  const toolbar = el(
    "div",
    undefined,
    "toolbar",
    actionButton(controller.getNavAttributes("prev"), "prev", "‹"),
    actionButton(
      controller.getNavAttributes("today"),
      "today",
      String(controller.getNavAttributes("today")["aria-label"]),
    ),
    actionButton(controller.getNavAttributes("next"), "next", "›"),
    el("h2", controller.getTitleAttributes(), undefined, state.title.text),
    el(
      "div",
      undefined,
      "views",
      ...VIEWS.map(([id, label]) =>
        actionButton(controller.getViewButtonAttributes(id), "view", label),
      ),
    ),
  );

  let body: HTMLElement;
  if (layout.kind === "month") {
    const model = layout.months[0];
    body = el(
      "table",
      controller.getGridAttributes(0),
      "month",
      el(
        "thead",
        undefined,
        undefined,
        el(
          "tr",
          undefined,
          undefined,
          layout.weekNumbers ? el("td", undefined, undefined) : null,
          ...layout.weekdays.map((header) =>
            el(
              "th",
              controller.getColumnHeaderAttributes(header),
              undefined,
              header.short,
            ),
          ),
        ),
      ),
      el(
        "tbody",
        undefined,
        undefined,
        ...(model?.weeks ?? []).map((week) =>
          el(
            "tr",
            undefined,
            undefined,
            layout.weekNumbers
              ? el(
                  "th",
                  controller.getWeekNumberAttributes(week.weekNumber),
                  undefined,
                  String(week.weekNumber),
                )
              : null,
            ...week.days
              .filter((day: CalendarDay) => !day.hidden)
              .map((day: CalendarDay) =>
                el(
                  "td",
                  controller.getCellAttributes(day),
                  undefined,
                  el("span", undefined, "day-num", String(day.date.day)),
                  eventsOf(controller, state, day),
                  moreOf(controller, state, day),
                ),
              ),
          ),
        ),
      ),
    );
  } else if (layout.kind === "time-grid") {
    const header = el(
      "div",
      { role: "row" },
      "time-row time-head",
      el("span", undefined, "time-label"),
      ...layout.days.map((day) => {
        const head = el(
          "div",
          controller.getColumnHeaderAttributes(day),
          "col-head",
          el("small", undefined, undefined, weekday(day.date, "short")),
          String(day.date.day),
        );
        return head;
      }),
    );
    const rows = layout.slots.map((slot) =>
      el(
        "div",
        { role: "row" },
        "time-row",
        el(
          "span",
          undefined,
          "time-label",
          slot.start.minute === 0 ? hhmm(slot.start) : "",
        ),
        ...layout.days.map((day) =>
          el("div", controller.getSlotAttributes(slot, day), "slot"),
        ),
      ),
    );
    const allDay = el(
      "div",
      undefined,
      "all-day-row",
      ...state.allDayRow.map((segment) =>
        el(
          "div",
          controller.getEventAttributes(segment),
          undefined,
          chip(segment),
        ),
      ),
    );
    const columns = layout.days.map((day) => {
      const preview = controller.getSelectionPreviewAttributes(day);
      return el(
        "div",
        undefined,
        "day-col",
        eventsOf(controller, state, day),
        Object.keys(preview).length > 0
          ? el("div", preview, "selection-preview")
          : null,
      );
    });
    const now = controller.getNowIndicatorAttributes();
    const events = el(
      "div",
      undefined,
      "time-events",
      ...columns,
      Object.keys(now).length > 0 ? el("div", now, "now-indicator") : null,
    );
    const body2 = el(
      "div",
      undefined,
      "time-body",
      el("div", undefined, "time-slots", ...rows),
      events,
    );
    const grid = el("div", undefined, undefined, allDay, header, body2);
    grid.style.setProperty("--cols", String(layout.days.length));
    body = el("div", controller.getTimeGridAttributes(), "time-grid", grid);
  } else {
    body = el(
      "ul",
      controller.getAgendaAttributes(),
      "agenda",
      ...layout.days.map((day) => {
        const segments = controller.getCellEventSegments(day);
        return el(
          "li",
          controller.getAgendaDayAttributes(day),
          undefined,
          el(
            "div",
            undefined,
            "agenda-head",
            el("strong", undefined, undefined, weekday(day.date, "long")),
            el("span", undefined, undefined, shortDate(day.date)),
          ),
          eventsOf(controller, state, day),
          segments.length > 0
            ? null
            : el("small", undefined, "agenda-empty", "No events"),
        );
      }),
    );
  }
  root.replaceChildren(toolbar, body);
  calendar.syncFocus();
}

export function renderMini(root: HTMLElement, mini: VanillaMiniCalendar): void {
  const { controller } = mini;
  const state = mini.getState();
  const { layout } = state;
  applyAttributes(root, controller.getRootAttributes());
  const model = layout.months[0];
  root.replaceChildren(
    el(
      "div",
      undefined,
      "mini-head",
      actionButton(controller.getNavAttributes("prev"), "prev", "‹"),
      el("h2", controller.getTitleAttributes(), undefined, state.title.text),
      actionButton(controller.getNavAttributes("next"), "next", "›"),
    ),
    el(
      "table",
      controller.getGridAttributes(),
      undefined,
      el(
        "thead",
        undefined,
        undefined,
        el(
          "tr",
          undefined,
          undefined,
          ...layout.weekdays.map((header) =>
            el(
              "th",
              controller.getColumnHeaderAttributes(header),
              undefined,
              header.short,
            ),
          ),
        ),
      ),
      el(
        "tbody",
        undefined,
        undefined,
        ...(model?.weeks ?? []).map((week) =>
          el(
            "tr",
            undefined,
            undefined,
            ...week.days.map((day) =>
              el(
                "td",
                controller.getCellAttributes(day),
                undefined,
                String(day.date.day),
              ),
            ),
          ),
        ),
      ),
    ),
  );
  mini.syncFocus();
}
