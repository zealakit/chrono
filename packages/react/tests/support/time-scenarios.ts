import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { fireEvent } from "@testing-library/react";
import { parseIsoTime } from "@zealakit/chrono-core/foundation";

export const TIME_FIXTURE = fileURLToPath(
  new URL("../../../../tests/fixtures/time-parity.json", import.meta.url),
);

export type TimeStep = { click?: string; press?: string; type?: string };
export type TimeScenario = {
  name: string;
  kind: "time-panel" | "time-range-panel" | "time-input" | "time-range-input";
  options: Record<string, unknown>;
  steps: TimeStep[];
  snapshot?: string;
};

export const readTimeScenarios = (): { scenarios: TimeScenario[] } =>
  JSON.parse(readFileSync(TIME_FIXTURE, "utf8"));
export const writeTimeScenarios = (data: unknown): void =>
  writeFileSync(TIME_FIXTURE, `${JSON.stringify(data, null, 2)}\n`);

const parseValue = (value: unknown): unknown => {
  if (typeof value === "string") return parseIsoTime(value);
  if (Array.isArray(value)) return value.map(parseValue);
  if (value && typeof value === "object") {
    const range = value as { start: string; end: string };
    return { start: parseValue(range.start), end: parseValue(range.end) };
  }
  return value;
};

/** JSON options to real options (ISO strings to dates). */
export function toTimeOptions(scenario: TimeScenario): Record<string, unknown> {
  const options = { ...scenario.options };
  for (const key of ["value", "defaultValue"]) {
    if (key in options) options[key] = parseValue(options[key]);
  }
  return options;
}

/** Apply one step with DOM events, the way a user would. */
export function applyTimeStep(container: Element, step: TimeStep): void {
  if (step.click) {
    const target = container.querySelector(`[data-chrono-key="${step.click}"]`);
    if (!target) throw new Error(`step target not found: ${step.click}`);
    fireEvent.click(target);
  } else if (step.press) {
    const cell = container.querySelector('[data-chrono-key][tabindex="0"]');
    if (!cell) throw new Error("no focusable cell");
    (cell as HTMLElement).focus();
    fireEvent.keyDown(cell, { key: step.press });
  } else if (step.type) {
    (container.querySelector("[data-chrono-part]") as HTMLElement).focus();
    for (const key of step.type) {
      fireEvent.keyDown(document.activeElement as Element, { key });
    }
  }
}
