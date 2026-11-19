import type {
  DateInputController,
  DateInputState,
  PanelController,
  PanelState,
} from "@zealakit/chrono-core/date";
import { applyAttributes } from "../shared/apply-attributes.js";

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
  for (const [name, value] of Object.entries(extra)) {
    element.setAttribute(name, value);
  }
  for (const child of children) {
    if (child !== null) element.append(child);
  }
  return element;
}

/** Unstyled markup for a panel, from its state and attribute records. */
export function renderPanel(
  root: HTMLElement,
  controller: PanelController<unknown, unknown>,
): void {
  const doc = root.ownerDocument;
  const state: PanelState = controller.getState();
  const button = (action: "prev" | "next", label: string) =>
    make(doc, "button", controller.getNavAttributes(action), [label], {
      "data-chrono-action": action,
    });
  const nav = (kind: "prev" | "next") =>
    button(kind, String(controller.getNavAttributes(kind)["aria-label"]));

  const cell = (td: HTMLElement) => td;
  const grids: HTMLElement[] = [];
  if (state.level === "day") {
    for (const month of state.months) {
      grids.push(
        make(doc, "table", controller.getGridAttributes(), [
          make(doc, "thead", {}, [
            make(doc, "tr", {}, [
              state.weekNumbers ? make(doc, "td", {}) : null,
              ...state.weekdays.map((header) =>
                make(doc, "th", controller.getColumnHeaderAttributes(header), [
                  header.short,
                ]),
              ),
            ]),
          ]),
          make(
            doc,
            "tbody",
            {},
            month.weeks.map((week) =>
              make(doc, "tr", {}, [
                state.weekNumbers
                  ? make(
                      doc,
                      "th",
                      controller.getWeekNumberAttributes(week.weekNumber),
                      [String(week.weekNumber)],
                    )
                  : null,
                ...week.days.map((day) =>
                  cell(
                    make(doc, "td", controller.getCellAttributes(day), [
                      day.hidden ? null : String(day.date.day),
                    ]),
                  ),
                ),
              ]),
            ),
          ),
        ]),
      );
    }
  } else {
    const rows: HTMLElement[] = [];
    for (let index = 0; index < state.cells.length; index += 4) {
      rows.push(
        make(
          doc,
          "tr",
          {},
          state.cells
            .slice(index, index + 4)
            .map((item) =>
              make(doc, "td", controller.getLevelCellAttributes(item), [
                item.text,
              ]),
            ),
        ),
      );
    }
    grids.push(
      make(doc, "table", controller.getGridAttributes(), [
        make(doc, "tbody", {}, rows),
      ]),
    );
  }

  applyAttributes(root, controller.getRootAttributes());
  root.replaceChildren(
    nav("prev"),
    make(doc, "h2", controller.getTitleAttributes(), [state.title]),
    nav("next"),
    ...grids,
  );
}

function renderField(
  doc: Document,
  controller: DateInputController,
  state: DateInputState,
): Node[] {
  if (state.mode === "text") {
    const input = make(doc, "input", controller.getTextFieldAttributes(), [], {
      "data-chrono-text": "",
    }) as HTMLInputElement;
    input.value = state.text;
    return [input];
  }
  return state.segments.map((segment) =>
    make(doc, "span", controller.getSegmentAttributes(segment), [segment.text]),
  );
}

/** Unstyled markup for a single date input. */
export function renderInput(
  root: HTMLElement,
  controller: DateInputController,
): void {
  const doc = root.ownerDocument;
  const state = controller.getState();
  applyAttributes(root, controller.getRootAttributes());
  root.replaceChildren(
    ...renderField(doc, controller, state),
    ...state.hidden.map((input) =>
      make(doc, "input", {
        type: "hidden",
        name: input.name,
        value: input.value,
      }),
    ),
  );
}

/** Unstyled markup for a range input: two fields and a separator. */
export function renderRangeInput(
  root: HTMLElement,
  controller: {
    getStart(): DateInputController;
    getEnd(): DateInputController;
    getRootAttributes(): Record<string, string | number | boolean | undefined>;
    getState(): { hidden: { name: string; value: string }[] };
  },
): void {
  const doc = root.ownerDocument;
  const field = (side: "start" | "end") => {
    const sub = side === "start" ? controller.getStart() : controller.getEnd();
    const state = sub.getState();
    return make(
      doc,
      "div",
      {
        ...sub.getRootAttributes(),
        role: "group",
        "aria-label":
          state.messages[side === "start" ? "startDate" : "endDate"],
      },
      renderField(doc, sub, state),
      { "data-chrono-field": side },
    );
  };
  applyAttributes(root, controller.getRootAttributes());
  root.replaceChildren(
    field("start"),
    make(doc, "span", { "aria-hidden": "true" }, ["–"]),
    field("end"),
    ...controller.getState().hidden.map((input) =>
      make(doc, "input", {
        type: "hidden",
        name: input.name,
        value: input.value,
      }),
    ),
  );
}
