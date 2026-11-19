import type {
  DateRangeValue,
  DateValue,
  MultiDateValue,
} from "@zealakit/chrono-core/date";
import {
  type PlainDate,
  focusDateCell,
  parseIsoDate,
  toIsoString,
} from "@zealakit/chrono-core/foundation";
import { createDateInput, createDateRangeInput } from "./create-date-input.js";
import {
  createDatePanel,
  createDateRangePanel,
  createMultiDatePanel,
} from "./create-date-panel.js";
import { renderInput, renderPanel, renderRangeInput } from "./render.js";

type Kind = "input" | "range-input" | "panel" | "range-panel" | "multi-panel";

const SELECTORS: Record<Kind, string> = {
  input: "[data-chrono-date-input]",
  "range-input": "[data-chrono-date-range-input]",
  panel:
    "[data-chrono-date-panel]:not([data-chrono-date-panel=range]):not([data-chrono-date-panel=multi])",
  "range-panel":
    "[data-chrono-date-range-panel], [data-chrono-date-panel=range]",
  "multi-panel":
    "[data-chrono-multi-date-panel], [data-chrono-date-panel=multi]",
};

const STRINGS = [
  "min",
  "max",
  "locale",
  "mode",
  "name",
  "startName",
  "endName",
  "timeZone",
  "pageBy",
  "level",
  "defaultLevel",
  "minLevel",
  "maxLevel",
] as const;
const NUMBERS = [
  "months",
  "weekStartsOn",
  "now",
  "minDays",
  "maxDays",
  "maxSelected",
] as const;
const BOOLEANS = [
  "required",
  "disabled",
  "readOnly",
  "autoFocus",
  "selectToday",
  "followValue",
  "allowUnavailableInside",
  "allowDisabledInside",
] as const;

const kebab = (name: string): string =>
  `data-${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

/** Options from `data-*` attributes (`data-min`, `data-week-starts-on`, `data-months`, ...). */
function readOptions(element: Element): Record<string, unknown> {
  const options: Record<string, unknown> = {};
  for (const name of STRINGS) {
    const value = element.getAttribute(kebab(name));
    if (value !== null) options[name] = value;
  }
  for (const name of NUMBERS) {
    const value = element.getAttribute(kebab(name));
    if (value !== null && value !== "") options[name] = Number(value);
  }
  for (const name of BOOLEANS) {
    const value = element.getAttribute(kebab(name));
    if (value !== null) options[name] = value !== "false";
  }
  const weekNumbers = element.getAttribute("data-week-numbers");
  if (weekNumbers !== null) {
    options.weekNumbers =
      weekNumbers === "false" ? false : weekNumbers || "iso";
  }
  return options;
}

const parseOne = (text: string): PlainDate | null => {
  try {
    return parseIsoDate(text.trim());
  } catch {
    return null;
  }
};

/** `2026-11-17`, `2026-11-01/2026-11-05` (range) or a comma list (multi). */
function readValue(kind: Kind, text: string | null): unknown {
  if (text === null) return undefined;
  if (kind === "input" || kind === "panel") return parseOne(text);
  if (kind === "range-input" || kind === "range-panel") {
    const [start, end] = text.split("/");
    const value = { start: parseOne(start ?? ""), end: parseOne(end ?? "") };
    return value.start || value.end ? value : null;
  }
  return text
    .split(",")
    .map(parseOne)
    .filter((date): date is PlainDate => date !== null);
}

const serialize = (value: unknown): unknown => {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map((date) => toIsoString(date));
  if ("year" in (value as object)) return toIsoString(value as PlainDate);
  const range = value as { start: PlainDate | null; end: PlainDate | null };
  return {
    start: range.start ? toIsoString(range.start) : null,
    end: range.end ? toIsoString(range.end) : null,
  };
};

type Instance = {
  element: Element;
  kind: Kind;
  setValue(value: unknown): void;
  group: Instance[];
};

/**
 * Declarative init (02 §6, §11.5): finds the date elements under `root`, reads
 * their options from `data-*`, renders unstyled markup inside and dispatches
 * `chrono:valuechange` / `chrono:valuecommit` (detail `{ value }`, ISO strings).
 * `data-chrono-for="<id>"` links a panel to an input so they share one value.
 * Returns a cleanup function.
 */
export function initDateElements(root: ParentNode = document): () => void {
  const cleanups: (() => void)[] = [];
  const instances = new Map<Element, Instance>();

  const emit = (element: Element, type: string, value: unknown): void => {
    element.dispatchEvent(
      new CustomEvent(type, {
        bubbles: true,
        detail: { value: serialize(value) },
      }),
    );
  };

  for (const kind of Object.keys(SELECTORS) as Kind[]) {
    for (const element of root.querySelectorAll<HTMLElement>(SELECTORS[kind])) {
      if (instances.has(element)) continue;
      const instance: Instance = {
        element,
        kind,
        setValue: () => {},
        group: [],
      };
      instance.group = [instance];
      instances.set(element, instance);
      const options: Record<string, unknown> = {
        ...readOptions(element),
        ...(element.id ? { id: element.id } : {}),
        onValueChange: (value: unknown) => {
          emit(element, "chrono:valuechange", value);
          for (const member of instance.group) member.setValue(value);
        },
        onValueCommit: (value: unknown) =>
          emit(element, "chrono:valuecommit", value),
      };
      const value = readValue(kind, element.getAttribute("data-value"));
      if (value !== undefined) options.value = value;
      const defaultValue = readValue(
        kind,
        element.getAttribute("data-default-value"),
      );
      if (defaultValue !== undefined) options.defaultValue = defaultValue;
      if (kind === "range-panel" && options.months === undefined)
        options.months = 2;

      if (kind === "input") {
        const field = createDateInput(element, options);
        const paint = () =>
          field.suspend(() => {
            renderInput(element, field.controller);
            field.syncFocus();
          });
        paint();
        const stop = field.subscribe(paint);
        instance.setValue = (next) =>
          field.setOptions({ value: next as DateValue });
        cleanups.push(() => {
          stop();
          field.destroy();
        });
      } else if (kind === "range-input") {
        const field = createDateRangeInput(element, options);
        const paint = () =>
          field.suspend(() => {
            renderRangeInput(element, field.controller as never);
            field.syncFocus();
          });
        paint();
        const stop = field.subscribe(paint);
        instance.setValue = (next) =>
          field.setOptions({ value: next as DateRangeValue });
        cleanups.push(() => {
          stop();
          field.destroy();
        });
      } else {
        const create =
          kind === "panel"
            ? createDatePanel
            : kind === "range-panel"
              ? createDateRangePanel
              : createMultiDatePanel;
        const panel = create(element, options as never);
        const paint = () => {
          renderPanel(element, panel.controller as never);
          panel.syncFocus();
        };
        paint();
        const stop = panel.subscribe(paint);
        instance.setValue = (next) =>
          panel.setOptions({
            value: next as DateValue & DateRangeValue & MultiDateValue,
          } as never);
        if (panel.getState().autoFocus) {
          const state = panel.getState();
          focusDateCell(element, toIsoString(state.focusedDate));
        }
        cleanups.push(() => {
          stop();
          panel.destroy();
        });
      }
    }
  }

  // data-chrono-for links a panel to the input with that id: one shared value.
  for (const instance of instances.values()) {
    const targetId = instance.element.getAttribute("data-chrono-for");
    if (!targetId) continue;
    const target = [...instances.values()].find(
      (other) => other.element.id === targetId,
    );
    if (!target || target === instance) continue;
    const merged = [...new Set([...target.group, ...instance.group])];
    for (const member of merged) member.group = merged;
    const seed = target.element.getAttribute("data-value");
    if (seed !== null) instance.setValue(readValue(target.kind, seed));
  }

  return () => {
    for (const cleanup of cleanups.splice(0)) cleanup();
  };
}
