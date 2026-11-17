import type {
  TimeInputController,
  TimePanelController,
} from "@zealakit/chrono-core/time";
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
  for (const [name, value] of Object.entries(extra))
    element.setAttribute(name, value);
  for (const child of children) if (child !== null) element.append(child);
  return element;
}

/** Unstyled markup for a time panel, from its state and attribute records. */
export function renderTimePanel(
  root: HTMLElement,
  controller: TimePanelController<unknown, unknown>,
): void {
  const doc = root.ownerDocument;
  const state = controller.getState();
  const optionNode = (
    option: Parameters<typeof controller.getOptionAttributes>[0],
  ) => make(doc, "div", controller.getOptionAttributes(option), [option.text]);
  const columnNode = (column: (typeof state.sets)[number]["columns"][number]) =>
    make(
      doc,
      "div",
      controller.getColumnAttributes(column),
      column.options.map(optionNode),
    );
  let children: HTMLElement[];
  if (state.layout === "list") {
    children = [
      make(
        doc,
        "div",
        controller.getListAttributes(),
        state.groups.map((group) =>
          make(doc, "div", controller.getGroupAttributes(group), [
            group.label ? make(doc, "div", {}, [group.label]) : null,
            ...group.options.map(optionNode),
          ]),
        ),
      ),
    ];
  } else if (state.kind === "range") {
    children = state.sets.map((set) =>
      make(
        doc,
        "div",
        controller.getSetAttributes(set),
        set.columns.map(columnNode),
      ),
    );
  } else {
    children = state.sets.flatMap((set) => set.columns.map(columnNode));
  }
  applyAttributes(root, controller.getRootAttributes());
  root.replaceChildren(...children);
}

type FieldController = Pick<
  TimeInputController,
  "getState" | "getSegmentAttributes" | "getTextFieldAttributes"
>;

function renderField(doc: Document, controller: FieldController): Node[] {
  const state = controller.getState();
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

export function renderTimeInput(
  root: HTMLElement,
  controller: TimeInputController,
): void {
  const doc = root.ownerDocument;
  applyAttributes(root, controller.getRootAttributes());
  root.replaceChildren(
    ...renderField(doc, controller),
    ...hiddenNodes(doc, controller.getState().hidden),
  );
}

export function renderTimeRangeInput(
  root: HTMLElement,
  controller: {
    getStart(): TimeInputController;
    getEnd(): TimeInputController;
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
          sub.getState().messages[side === "start" ? "startTime" : "endTime"],
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
