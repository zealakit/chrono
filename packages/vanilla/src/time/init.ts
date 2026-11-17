import type { TimeRangeValue, TimeValue } from "@zealakit/chrono-core/time";
import {
  type PlainTime,
  focusDateCell,
  parseIsoTime,
} from "@zealakit/chrono-core/foundation";
import { createTimeInput, createTimeRangeInput } from "./create-time-input.js";
import { createTimePanel, createTimeRangePanel } from "./create-time-panel.js";
import {
  renderTimeInput,
  renderTimePanel,
  renderTimeRangeInput,
} from "./render.js";

type Kind = "input" | "range-input" | "panel" | "range-panel";

const SELECTORS: Record<Kind, string> = {
  input: "[data-chrono-time-input]",
  "range-input": "[data-chrono-time-range-input]",
  panel: "[data-chrono-time-panel]:not([data-chrono-time-panel=range])",
  "range-panel":
    "[data-chrono-time-range-panel], [data-chrono-time-panel=range]",
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
  "layout",
  "granularity",
  "hourCycle",
  "start",
  "end",
  "groupBy",
] as const;
const NUMBERS = ["now", "slotDuration", "minDuration", "maxDuration"] as const;
const BOOLEANS = [
  "required",
  "disabled",
  "readOnly",
  "autoFocus",
  "scrollToSelected",
  "allowOvernight",
] as const;

const kebab = (name: string): string =>
  `data-${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

/** Options from `data-*` attributes (`data-min`, `data-hour-cycle`, `data-slot-duration`, ...). */
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
  const minutes = element.getAttribute("data-step");
  const seconds = element.getAttribute("data-step-seconds");
  if (minutes !== null || seconds !== null) {
    options.step = {
      ...(minutes !== null ? { minutes: Number(minutes) } : {}),
      ...(seconds !== null ? { seconds: Number(seconds) } : {}),
    };
  }
  return options;
}

const parseOne = (text: string): PlainTime | null => {
  try {
    return parseIsoTime(text.trim());
  } catch {
    return null;
  }
};

/** `09:30` or, for ranges, `09:00/17:00`. */
function readValue(kind: Kind, text: string | null): unknown {
  if (text === null) return undefined;
  if (kind === "input" || kind === "panel") return parseOne(text);
  const [start, end] = text.split("/");
  const value = { start: parseOne(start ?? ""), end: parseOne(end ?? "") };
  return value.start || value.end ? value : null;
}

const pad = (n: number) => String(n).padStart(2, "0");
const serializeOne = (time: PlainTime): string =>
  `${pad(time.hour)}:${pad(time.minute)}${time.second ? `:${pad(time.second)}` : ""}`;
const serialize = (value: unknown): unknown => {
  if (value === null || value === undefined) return null;
  if ("hour" in (value as object)) return serializeOne(value as PlainTime);
  const range = value as { start: PlainTime | null; end: PlainTime | null };
  return {
    start: range.start ? serializeOne(range.start) : null,
    end: range.end ? serializeOne(range.end) : null,
  };
};

type Instance = {
  element: Element;
  kind: Kind;
  setValue(value: unknown): void;
  group: Instance[];
};

/**
 * Declarative init for Time (plan 07 T19): finds the time elements under `root`,
 * reads options from `data-*`, renders unstyled markup and dispatches
 * `chrono:valuechange` / `chrono:valuecommit` (detail `{ value }`, ISO times).
 * `data-chrono-for="<id>"` links a panel to an input so they share one value.
 * Returns a cleanup function.
 */
export function initTimeElements(root: ParentNode = document): () => void {
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

      if (kind === "input") {
        const field = createTimeInput(element, options);
        const paint = () =>
          field.suspend(() => {
            renderTimeInput(element, field.controller);
            field.syncFocus();
          });
        paint();
        const stop = field.subscribe(paint);
        instance.setValue = (next) =>
          field.setOptions({ value: next as TimeValue });
        cleanups.push(() => {
          stop();
          field.destroy();
        });
      } else if (kind === "range-input") {
        const field = createTimeRangeInput(element, options);
        const paint = () =>
          field.suspend(() => {
            renderTimeRangeInput(element, field.controller as never);
            field.syncFocus();
          });
        paint();
        const stop = field.subscribe(paint);
        instance.setValue = (next) =>
          field.setOptions({ value: next as TimeRangeValue });
        cleanups.push(() => {
          stop();
          field.destroy();
        });
      } else {
        const panel =
          kind === "panel"
            ? createTimePanel(element, options as never)
            : createTimeRangePanel(element, options as never);
        const paint = () => {
          renderTimePanel(element, panel.controller as never);
          panel.syncFocus();
        };
        paint();
        const stop = panel.subscribe(paint);
        instance.setValue = (next) =>
          panel.setOptions({ value: next } as never);
        if (panel.getState().autoFocus) {
          focusDateCell(element, panel.getState().focusKey);
        }
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
    const seed = target.element.getAttribute("data-value");
    if (seed !== null) instance.setValue(readValue(target.kind, seed));
  }

  return () => {
    for (const cleanup of cleanups.splice(0)) cleanup();
  };
}
