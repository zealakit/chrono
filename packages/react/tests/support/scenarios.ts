import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { fireEvent } from "@testing-library/react";
import { parseIsoDate } from "@zealakit/chrono-core/foundation";

export const FIXTURE = fileURLToPath(
  new URL("../../../../tests/fixtures/calendar-parity.json", import.meta.url),
);

export type Step = {
  click?: { label?: string; view?: string; day?: string };
  key?: string;
};
export type Scenario = {
  name: string;
  kind: "calendar" | "mini";
  options: Record<string, unknown>;
  steps: Step[];
  snapshot?: string;
};

export const readScenarios = (): { scenarios: Scenario[] } =>
  JSON.parse(readFileSync(FIXTURE, "utf8"));
export const writeScenarios = (data: unknown): void =>
  writeFileSync(FIXTURE, `${JSON.stringify(data, null, 2)}\n`);

/** JSON options to real options (ISO strings to dates, marked days to a predicate). */
export function toOptions(scenario: Scenario): Record<string, unknown> {
  const options = { ...scenario.options };
  const sync = options.syncWith as
    | { date: string; visibleRange: { start: string; end: string } }
    | undefined;
  if (sync) {
    options.syncWith = {
      date: parseIsoDate(sync.date),
      visibleRange: {
        start: parseIsoDate(sync.visibleRange.start),
        end: parseIsoDate(sync.visibleRange.end),
      },
    };
  }
  const marked = options.markedDays as string[] | undefined;
  if (marked) {
    delete options.markedDays;
    options.isMarked = (date: { year: number; month: number; day: number }) =>
      marked.includes(
        `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`,
      );
  }
  return options;
}

/** Apply one step with DOM events, the way a user would. */
export function applyStep(container: Element, step: Step): void {
  if (step.click) {
    const { label, view, day } = step.click;
    const target = label
      ? container.querySelector(`button[aria-label="${label}"]`)
      : view
        ? container.querySelector(`button[data-view="${view}"]`)
        : container.querySelector(`[data-chrono-key="${day}"]`);
    if (!target)
      throw new Error(`step target not found: ${JSON.stringify(step)}`);
    fireEvent.click(target);
  } else if (step.key) {
    const cell = container.querySelector('[data-chrono-key][tabindex="0"]');
    if (!cell) throw new Error("no focusable cell");
    (cell as HTMLElement).focus();
    fireEvent.keyDown(cell, { key: step.key });
  }
}
