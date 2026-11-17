import type {
  DateTimeRangeValue,
  DateTimeValue,
} from "@zealakit/chrono-core/datetime";
import {
  parseIsoDateTime,
  toIsoString,
  toZoned,
} from "@zealakit/chrono-core/foundation";
import {
  createDateTimeInput,
  createDateTimeRangeInput,
} from "./create-datetime-input.js";
import {
  createDateTimePanel,
  createDateTimeRangePanel,
} from "./create-datetime-panel.js";
import {
  renderDateTimeInput,
  renderDateTimePanel,
  renderDateTimeRangeInput,
  renderDateTimeRangePanel,
} from "./render.js";

type Kind = "input" | "range-input" | "panel" | "range-panel";

const SELECTORS: Record<Kind, string> = {
  input: "[data-chrono-datetime-input]",
  "range-input": "[data-chrono-datetime-range-input]",
  panel: "[data-chrono-datetime-panel]:not([data-chrono-datetime-panel=range])",
  "range-panel":
    "[data-chrono-datetime-range-panel], [data-chrono-datetime-panel=range]",
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
  "valueTimeZone",
  "disambiguation",
  "granularity",
  "hourCycle",
  "defaultTime",
] as const;
const NUMBERS = [
  "now",
  "minDuration",
  "maxDuration",
  "weekStartsOn",
  "months",
] as const;
const BOOLEANS = [
  "required",
  "disabled",
  "readOnly",
  "autoFocus",
  "disablePast",
] as const;

const kebab = (name: string): string =>
  `data-${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

/** Options from `data-*` attributes (`data-time-zone`, `data-min`, `data-disable-past`, ...). */
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
  const step = element.getAttribute("data-step");
  if (step !== null) options.step = { minutes: Number(step) };
  return options;
}

function parseOne(text: string, timeZone: string | undefined): DateTimeValue {
  try {
    const wall = parseIsoDateTime(text.trim());
    return timeZone ? toZoned(wall, timeZone) : wall;
  } catch {
    return null;
  }
}

/** `2026-11-17T09:30` or, for ranges, `2026-11-17T09:30/2026-11-18T11:00`. */
function readValue(
  kind: Kind,
  text: string | null,
  timeZone: string | undefined,
): unknown {
  if (text === null) return undefined;
  if (kind === "input" || kind === "panel") return parseOne(text, timeZone);
  const [start, end] = text.split("/");
  const value = {
    start: parseOne(start ?? "", timeZone),
    end: parseOne(end ?? "", timeZone),
  };
  return value.start || value.end ? value : null;
}

const serializeOne = (value: unknown): string | null =>
  value ? toIsoString(value as never) : null;
const serialize = (value: unknown): unknown => {
  if (value === null || value === undefined) return null;
  if ("hour" in (value as object)) return serializeOne(value);
  const range = value as { start: unknown; end: unknown };
  return { start: serializeOne(range.start), end: serializeOne(range.end) };
};

type Instance = {
  element: Element;
  kind: Kind;
  setValue(value: unknown): void;
  group: Instance[];
};

/**
 * Declarative init for DateTime (plan 08 X13): finds the date-time elements under `root`,
 * reads options from `data-*`, renders unstyled markup and dispatches
 * `chrono:valuechange` / `chrono:valuecommit` (detail `{ value }`, ISO strings).
 * `data-chrono-for="<id>"` links a panel to an input so they share one value.
 * Returns a cleanup function.
 */
export function initDateTimeElements(root: ParentNode = document): () => void {
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
      const data = readOptions(element);
      const zone = data.timeZone as string | undefined;
      const options: Record<string, unknown> = {
        ...data,
        ...(element.id ? { id: element.id } : {}),
        onValueChange: (value: unknown) => {
          emit(element, "chrono:valuechange", value);
          for (const member of instance.group) member.setValue(value);
        },
        onValueCommit: (value: unknown) =>
          emit(element, "chrono:valuecommit", value),
      };
      if (kind === "panel" || kind === "range-panel") {
        options.date = { weekStartsOn: data.weekStartsOn, months: data.months };
        options.time = {
          hourCycle: data.hourCycle,
          granularity: data.granularity,
          step: data.step,
        };
        options.startTime = options.time;
        options.endTime = options.time;
      }
      const value = readValue(kind, element.getAttribute("data-value"), zone);
      if (value !== undefined) options.value = value;
      const defaultValue = readValue(
        kind,
        element.getAttribute("data-default-value"),
        zone,
      );
      if (defaultValue !== undefined) options.defaultValue = defaultValue;

      if (kind === "input") {
        const field = createDateTimeInput(element, options);
        const paint = () =>
          field.suspend(() => {
            renderDateTimeInput(element, field.controller);
            field.syncFocus();
          });
        paint();
        const stop = field.subscribe(paint);
        instance.setValue = (next) =>
          field.setOptions({ value: next as DateTimeValue });
        cleanups.push(() => {
          stop();
          field.destroy();
        });
      } else if (kind === "range-input") {
        const field = createDateTimeRangeInput(element, options);
        const paint = () =>
          field.suspend(() => {
            renderDateTimeRangeInput(element, field.controller as never);
            field.syncFocus();
          });
        paint();
        const stop = field.subscribe(paint);
        instance.setValue = (next) =>
          field.setOptions({ value: next as DateTimeRangeValue });
        cleanups.push(() => {
          stop();
          field.destroy();
        });
      } else if (kind === "panel") {
        // Hosts exist before the listeners attach.
        renderDateTimePanelOnce(element, kind);
        const panel = createDateTimePanel(element, options as never);
        const paint = () => {
          renderDateTimePanel(element, panel.controller);
          panel.syncFocus();
        };
        paint();
        const stop = panel.subscribe(paint);
        instance.setValue = (next) =>
          panel.setOptions({ value: next as DateTimeValue });
        cleanups.push(() => {
          stop();
          panel.destroy();
        });
      } else {
        renderDateTimePanelOnce(element, kind);
        const panel = createDateTimeRangePanel(element, options as never);
        const paint = () => {
          renderDateTimeRangePanel(element, panel.controller);
          panel.syncFocus();
        };
        paint();
        const stop = panel.subscribe(paint);
        instance.setValue = (next) =>
          panel.setOptions({ value: next as DateTimeRangeValue });
        cleanups.push(() => {
          stop();
          panel.destroy();
        });
      }
    }
  }

  for (const instance of instances.values()) {
    const targetId = instance.element.getAttribute("data-chrono-for");
    if (!targetId) continue;
    const target = [...instances.values()].find(
      (other) => other.element.id === targetId,
    );
    if (!target || target === instance) continue;
    const merged = [...new Set([...target.group, ...instance.group])];
    for (const member of merged) member.group = merged;
  }

  return () => {
    for (const cleanup of cleanups.splice(0)) cleanup();
  };
}

/** Create the date and time hosts so the panel's listeners attach to them. */
function renderDateTimePanelOnce(element: HTMLElement, kind: Kind): void {
  const names =
    kind === "range-panel"
      ? [
          "data-chrono-datetime-date",
          "data-chrono-datetime-start-time",
          "data-chrono-datetime-end-time",
        ]
      : ["data-chrono-datetime-date", "data-chrono-datetime-time"];
  for (const name of names) {
    if (!element.querySelector(`[${name}]`)) {
      const host = element.ownerDocument.createElement("div");
      host.setAttribute(name, "");
      element.append(host);
    }
  }
}
