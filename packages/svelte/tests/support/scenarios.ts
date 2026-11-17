import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseIsoDate } from "@zealakit/chrono-core/foundation";
import { settle } from "./reference.ts";

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

export function click(element: Element): void {
  element.dispatchEvent(
    new window.MouseEvent("click", { bubbles: true, cancelable: true }),
  );
}

export function press(
  element: Element,
  key: string,
  init: object = {},
): boolean {
  return element.dispatchEvent(
    new window.KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true,
      ...init,
    }),
  );
}

/** Apply one step with DOM events, the way a user would. */
export async function applyStep(container: Element, step: Step): Promise<void> {
  if (step.click) {
    const { label, view, day } = step.click;
    const target = label
      ? container.querySelector(`button[aria-label="${label}"]`)
      : view
        ? container.querySelector(`button[data-view="${view}"]`)
        : container.querySelector(`[data-chrono-key="${day}"]`);
    if (!target)
      throw new Error(`step target not found: ${JSON.stringify(step)}`);
    click(target);
  } else if (step.key) {
    const cell = container.querySelector('[data-chrono-key][tabindex="0"]');
    if (!cell) throw new Error("no focusable cell");
    (cell as HTMLElement).focus();
    press(cell, step.key);
  }
  await settle();
}
