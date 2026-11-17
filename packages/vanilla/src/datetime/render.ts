import type {
  DateTimeInputController,
  DateTimePanelController,
  DateTimeRangePanelController,
} from "@zealakit/chrono-core/datetime";
import { renderPanel } from "../date/render.js";
import { applyAttributes } from "../shared/apply-attributes.js";
import { renderTimePanel } from "../time/render.js";

type Child = Node | string | null;

function make(
  doc: Document,
  tag: string,
  attributes: Record<string, string | number | boolean | undefined>,
  children: Child[] = [],
  extra: Record<string, string> = {},
): HTMLElement {
  const element = doc.createElement(tag);
  applyAttributes(element, attributes);
  for (const [name, value] of Object.entries(extra))
    element.setAttribute(name, value);
  for (const child of children) if (child !== null) element.append(child);
  return element;
}

function renderField(
  doc: Document,
  controller: DateTimeInputController,
): Node[] {
  const state = controller.getState();
  if (state.mode === "text") {
    const field = (which: "date" | "time") => {
      const input = make(
        doc,
        "input",
        which === "date"
          ? controller.getDateFieldAttributes()
          : controller.getTimeFieldAttributes(),
        [],
        { "data-chrono-text": which },
      ) as HTMLInputElement;
      input.value =
        which === "date" ? state.dateField.text : state.timeField.text;
      return input;
    };
    return [field("date"), field("time")];
  }
  return state.segments.map((segment) =>
    make(doc, "span", controller.getSegmentAttributes(segment), [segment.text]),
  );
}

const hiddenNodes = (
  doc: Document,
  inputs: { name: string; value: string }[],
) =>
  inputs.map((input) =>
    make(doc, "input", {
      type: "hidden",
      name: input.name,
      value: input.value,
    }),
  );

/** Unstyled markup for a date-time input (segments, or a date and a time field). */
export function renderDateTimeInput(
  root: HTMLElement,
  controller: DateTimeInputController,
): void {
  const doc = root.ownerDocument;
  applyAttributes(root, controller.getRootAttributes());
  root.replaceChildren(
    ...renderField(doc, controller),
    ...hiddenNodes(doc, controller.getState().hidden),
  );
}

export function renderDateTimeRangeInput(
  root: HTMLElement,
  controller: {
    getStart(): DateTimeInputController;
    getEnd(): DateTimeInputController;
    getRootAttributes(): Record<string, string | number | boolean | undefined>;
    getState(): { hidden: { name: string; value: string }[] };
  },
): void {
  const doc = root.ownerDocument;
  const field = (side: "start" | "end") => {
    const sub = side === "start" ? controller.getStart() : controller.getEnd();
    return make(
      doc,
      "div",
      {
        ...sub.getRootAttributes(),
        role: "group",
        "aria-label":
          sub.getState().messages[
            side === "start" ? "startDateTime" : "endDateTime"
          ],
      },
      renderField(doc, sub),
      { "data-chrono-field": side },
    );
  };
  applyAttributes(root, controller.getRootAttributes());
  root.replaceChildren(
    field("start"),
    make(doc, "span", { "aria-hidden": "true" }, ["–"]),
    field("end"),
    ...hiddenNodes(doc, controller.getState().hidden),
  );
}

/** The host element for one panel inside a date-time panel, created on first use. */
function ensureHost(root: HTMLElement, name: string): HTMLElement {
  let found = root.querySelector<HTMLElement>(`[${name}]`);
  if (!found) {
    found = root.ownerDocument.createElement("div");
    found.setAttribute(name, "");
    root.append(found);
  }
  return found;
}

/** Unstyled markup for a date-time panel: a Date panel and a Time panel in two hosts. */
export function renderDateTimePanel(
  root: HTMLElement,
  controller: DateTimePanelController,
): void {
  applyAttributes(root, controller.getRootAttributes());
  renderPanel(
    ensureHost(root, "data-chrono-datetime-date"),
    controller.getDate() as never,
  );
  renderTimePanel(
    ensureHost(root, "data-chrono-datetime-time"),
    controller.getTime() as never,
  );
}

export function renderDateTimeRangePanel(
  root: HTMLElement,
  controller: DateTimeRangePanelController,
): void {
  applyAttributes(root, controller.getRootAttributes());
  renderPanel(
    ensureHost(root, "data-chrono-datetime-date"),
    controller.getDate() as never,
  );
  renderTimePanel(
    ensureHost(root, "data-chrono-datetime-start-time"),
    controller.getStartTime() as never,
  );
  renderTimePanel(
    ensureHost(root, "data-chrono-datetime-end-time"),
    controller.getEndTime() as never,
  );
}
