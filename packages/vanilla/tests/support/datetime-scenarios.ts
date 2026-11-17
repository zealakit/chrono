import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { click, press } from "./scenarios.ts";
import { parseIsoDateTime } from "@zealakit/chrono-core/foundation";

export const DATETIME_FIXTURE = fileURLToPath(
  new URL("../../../../tests/fixtures/datetime-parity.json", import.meta.url),
);

export type DateTimeStep = { click?: string; press?: string; type?: string };
export type DateTimeScenario = {
  name: string;
  kind:
    | "datetime-panel"
    | "datetime-range-panel"
    | "datetime-input"
    | "datetime-range-input";
  options: Record<string, unknown>;
  steps: DateTimeStep[];
  snapshot?: string;
};

export const readDateTimeScenarios = (): { scenarios: DateTimeScenario[] } =>
  JSON.parse(readFileSync(DATETIME_FIXTURE, "utf8"));
export const writeDateTimeScenarios = (data: unknown): void =>
  writeFileSync(DATETIME_FIXTURE, `${JSON.stringify(data, null, 2)}\n`);

const parseValue = (value: unknown): unknown => {
  if (typeof value === "string") return parseIsoDateTime(value);
  if (Array.isArray(value)) return value.map(parseValue);
  if (value && typeof value === "object") {
    const range = value as { start: string; end: string };
    return { start: parseValue(range.start), end: parseValue(range.end) };
  }
  return value;
};

/** JSON options to real options (ISO strings to dates). */
export function toDateTimeOptions(
  scenario: DateTimeScenario,
): Record<string, unknown> {
  const options = { ...scenario.options };
  for (const key of ["value", "defaultValue"]) {
    if (key in options) options[key] = parseValue(options[key]);
  }
  return options;
}

/** Apply one step with DOM events, the way a user would. */
export function applyDateTimeStep(
  container: Element,
  step: DateTimeStep,
): void {
  if (step.click) {
    const target = container.querySelector(`[data-chrono-key="${step.click}"]`);
    if (!target) throw new Error(`step target not found: ${step.click}`);
    click(target);
  } else if (step.press) {
    const cell = container.querySelector('[data-chrono-key][tabindex="0"]');
    if (!cell) throw new Error("no focusable cell");
    (cell as HTMLElement).focus();
    press(cell, step.press);
  } else if (step.type) {
    (container.querySelector("[data-chrono-part]") as HTMLElement).focus();
    for (const key of step.type) {
      press(document.activeElement as Element, key);
    }
  }
}

/** The `data-*` options `initTimeElements` reads, as attributes (kebab-case). */
export function toDateTimeDataAttributes(
  input: Record<string, unknown>,
): string {
  // The declarative path reads the nested panel options from flat `data-*` attributes.
  const options: Record<string, unknown> = { ...input };
  const date = options.date as
    | { weekStartsOn?: number; months?: number }
    | undefined;
  const time = (options.time ?? options.startTime) as
    | { hourCycle?: string }
    | undefined;
  for (const key of ["date", "time", "startTime", "endTime"])
    delete options[key];
  if (date?.weekStartsOn !== undefined)
    options.weekStartsOn = date.weekStartsOn;
  if (date?.months !== undefined) options.months = date.months;
  if (time?.hourCycle !== undefined && options.hourCycle === undefined)
    options.hourCycle = time.hourCycle;
  const kebab = (name: string) =>
    name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
  return Object.entries(options)
    .filter(([key]) => key !== "id")
    .map(([key, value]) => {
      if (key === "step")
        return `data-step="${(value as { minutes?: number }).minutes ?? ""}"`;
      if (typeof value === "boolean") return value ? `data-${kebab(key)}` : "";
      if (value && typeof value === "object") {
        const range = value as { start: string; end: string };
        return `data-${kebab(key)}="${range.start}/${range.end}"`;
      }
      return `data-${kebab(key)}="${String(value)}"`;
    })
    .join(" ");
}
