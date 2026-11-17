import {
  type CalendarDay,
  type CalendarOptions,
  type MiniCalendarOptions,
  type VanillaCalendar,
  type VanillaMiniCalendar,
  applyAttributes,
  createCalendar,
  createMiniCalendar,
} from "../../dist/calendar/index.js";

export const VIEWS = [
  "month",
  "week",
  "workWeek",
  "day",
  "agenda",
  "multiMonth",
];

type Attrs = Record<string, string | number | boolean | undefined>;

function el(
  tag: string,
  attributes?: Attrs,
  ...children: (Node | string | null)[]
): HTMLElement {
  const element = document.createElement(tag);
  if (attributes) applyAttributes(element, attributes);
  for (const child of children) {
    if (child !== null) element.append(child);
  }
  return element;
}

/** The reference "template" every adapter renders for the parity scenarios (any templating works). */
function renderCalendar(root: HTMLElement, calendar: VanillaCalendar): void {
  const { controller } = calendar;
  const state = calendar.getState();
  const { layout } = state;
  applyAttributes(root, controller.getRootAttributes());

  const nav = (kind: "prev" | "today" | "next") => {
    const button = el(
      "button",
      controller.getNavAttributes(kind),
      controller.getNavAttributes(kind)["aria-label"] as string,
    );
    button.setAttribute("data-chrono-action", kind);
    return button;
  };
  const views = VIEWS.map((view) => {
    const button = el("button", controller.getViewButtonAttributes(view), view);
    button.setAttribute("data-chrono-action", "view");
    return button;
  });
  const children: HTMLElement[] = [
    el(
      "header",
      undefined,
      nav("prev"),
      nav("today"),
      nav("next"),
      el("h2", controller.getTitleAttributes(), state.title.text),
      ...views,
    ),
  ];

  if (layout.kind === "month") {
    layout.months.forEach((model, index) => {
      children.push(
        el(
          "table",
          controller.getGridAttributes(index),
          el(
            "thead",
            undefined,
            el(
              "tr",
              undefined,
              layout.weekNumbers ? el("td") : null,
              ...layout.weekdays.map((header) =>
                el(
                  "th",
                  controller.getColumnHeaderAttributes(header),
                  header.short,
                ),
              ),
            ),
          ),
          el(
            "tbody",
            undefined,
            ...model.weeks.map((week) =>
              el(
                "tr",
                undefined,
                layout.weekNumbers
                  ? el(
                      "th",
                      controller.getWeekNumberAttributes(week.weekNumber),
                      String(week.weekNumber),
                    )
                  : null,
                ...week.days
                  .filter((day: CalendarDay) => !day.hidden)
                  .map((day: CalendarDay) =>
                    el(
                      "td",
                      controller.getCellAttributes(day),
                      String(day.date.day),
                    ),
                  ),
              ),
            ),
          ),
        ),
      );
    });
  } else if (layout.kind === "time-grid") {
    children.push(
      el(
        "div",
        controller.getTimeGridAttributes(),
        el(
          "div",
          { role: "presentation" },
          el(
            "div",
            { role: "row" },
            ...layout.days.map((day) =>
              el(
                "div",
                controller.getColumnHeaderAttributes(day),
                String(day.date.day),
              ),
            ),
          ),
          ...layout.slots.map((slot) =>
            el(
              "div",
              { role: "row" },
              ...layout.days.map((day) =>
                el("div", controller.getSlotAttributes(slot, day)),
              ),
            ),
          ),
        ),
      ),
    );
  } else {
    children.push(
      el(
        "ul",
        controller.getAgendaAttributes(),
        ...layout.days.map((day) =>
          el(
            "li",
            controller.getAgendaDayAttributes(day),
            String(day.date.day),
          ),
        ),
      ),
    );
  }
  root.replaceChildren(...children);
  calendar.syncFocus();
}

export type Mounted = { root: HTMLElement; calendar: VanillaCalendar };

export function mountCalendar(options: CalendarOptions = {}): Mounted {
  const root = document.createElement("div");
  document.body.append(root);
  const calendar = createCalendar(root, options);
  calendar.subscribe(() => renderCalendar(root, calendar));
  renderCalendar(root, calendar);
  return { root, calendar };
}

function renderMini(root: HTMLElement, mini: VanillaMiniCalendar): void {
  const { controller } = mini;
  const state = mini.getState();
  const { layout } = state;
  applyAttributes(root, controller.getRootAttributes());
  const nav = (kind: "prev" | "next") => {
    const button = el(
      "button",
      controller.getNavAttributes(kind),
      controller.getNavAttributes(kind)["aria-label"] as string,
    );
    button.setAttribute("data-chrono-action", kind);
    return button;
  };
  const model = layout.months[0];
  root.replaceChildren(
    nav("prev"),
    el("h2", controller.getTitleAttributes(), state.title.text),
    nav("next"),
    el(
      "table",
      controller.getGridAttributes(),
      el(
        "thead",
        undefined,
        el(
          "tr",
          undefined,
          layout.weekNumbers ? el("td") : null,
          ...layout.weekdays.map((header) =>
            el(
              "th",
              controller.getColumnHeaderAttributes(header),
              header.short,
            ),
          ),
        ),
      ),
      el(
        "tbody",
        undefined,
        ...(model?.weeks ?? []).map((week) =>
          el(
            "tr",
            undefined,
            layout.weekNumbers
              ? el(
                  "th",
                  controller.getWeekNumberAttributes(week.weekNumber),
                  String(week.weekNumber),
                )
              : null,
            ...week.days.map((day) =>
              el("td", controller.getCellAttributes(day), String(day.date.day)),
            ),
          ),
        ),
      ),
    ),
  );
  mini.syncFocus();
}

export type MountedMini = { root: HTMLElement; mini: VanillaMiniCalendar };

export function mountMini(options: MiniCalendarOptions = {}): MountedMini {
  const root = document.createElement("div");
  document.body.append(root);
  const mini = createMiniCalendar(root, options);
  mini.subscribe(() => renderMini(root, mini));
  renderMini(root, mini);
  return { root, mini };
}
