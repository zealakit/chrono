import type { DayOfWeek } from "../../foundation/index.js";

import type {
  ResourceLayoutBuilder,
  TimelineSlotDuration,
  TimelineUnit,
} from "../resources/types.js";

/** Base layouts, plus the names resource packs add (plan 10 IG1). */
export type ViewLayout = "month" | "time-grid" | "list" | (string & {});

/** Exactly one of `days`, `weeks`, `months`. */
export type ViewLength = { days?: number; weeks?: number; months?: number };

/** Every view, built-in or custom, is data (C3). */
export type ViewDefinition = {
  id: string;
  layout: ViewLayout;
  length: ViewLength;
  /** Where a range starts relative to the anchor date. */
  align: "day" | "week" | "month" | "year";
  hiddenDays?: DayOfWeek[];
  /** Month layout only: how many month grids to show. */
  months?: number;
  /** Month layout only: always render 6 rows per month. */
  fixedWeeks?: boolean;
  /** Resource packs (plan 10 IG1): builds the layout; never serialized. */
  layoutBuilder?: ResourceLayoutBuilder;
  /** Timeline: the axis slot length (plan 10 R6). */
  slot?: TimelineSlotDuration;
  /** Timeline: header rows, coarser first. */
  headerRows?: TimelineUnit[];
};

export type CustomViews = Record<string, Omit<ViewDefinition, "id">>;

export const BUILT_IN_VIEW_IDS = [
  "month",
  "week",
  "workWeek",
  "day",
  "agenda",
  "multiMonth",
] as const;

/** Built-in definitions. `workWeek` hides the given weekend (C9). */
export function getBuiltInViews(
  weekend: readonly DayOfWeek[],
): Record<string, ViewDefinition> {
  const view = (
    id: string,
    layout: ViewLayout,
    length: ViewLength,
    align: ViewDefinition["align"],
    extra: Partial<ViewDefinition> = {},
  ): [string, ViewDefinition] => [id, { id, layout, length, align, ...extra }];
  return Object.fromEntries([
    view("month", "month", { months: 1 }, "month", { fixedWeeks: true }),
    view("week", "time-grid", { weeks: 1 }, "week"),
    view("workWeek", "time-grid", { weeks: 1 }, "week", {
      hiddenDays: [...weekend],
    }),
    view("day", "time-grid", { days: 1 }, "day"),
    view("agenda", "list", { days: 7 }, "day"),
    view("multiMonth", "month", { months: 3 }, "month", {
      months: 3,
      fixedWeeks: true,
    }),
  ]);
}

function assertDefinition(definition: ViewDefinition): void {
  const keys = (["days", "weeks", "months"] as const).filter(
    (key) => definition.length[key] !== undefined,
  );
  const value =
    keys.length === 1 ? definition.length[keys[0] as "days"] : undefined;
  if (value === undefined || !Number.isInteger(value) || value < 1) {
    throw new RangeError(
      `View "${definition.id}": length must be one positive integer.`,
    );
  }
}

/** Merge app definitions over the built-ins. */
export function resolveViews(
  custom: CustomViews | undefined,
  weekend: readonly DayOfWeek[],
): Record<string, ViewDefinition> {
  const views = getBuiltInViews(weekend);
  for (const [id, definition] of Object.entries(custom ?? {})) {
    const merged = { ...views[id], ...definition, id } as ViewDefinition;
    assertDefinition(merged);
    views[id] = merged;
  }
  return views;
}

function isDevelopment(): boolean {
  const env = (
    globalThis as { process?: { env?: Record<string, string | undefined> } }
  ).process?.env;
  return env?.NODE_ENV !== "production";
}

/** Look up a view. Unknown ids throw in development and fall back to `month` in production. */
export function resolveView(
  views: Record<string, ViewDefinition>,
  id: string,
): ViewDefinition {
  const found = views[id];
  if (found) {
    return found;
  }
  if (isDevelopment()) {
    throw new RangeError(`Unknown view "${id}".`);
  }
  return views.month as ViewDefinition;
}

/** Number of month grids a month-layout definition shows. */
export function getMonthCount(definition: ViewDefinition): number {
  return definition.months ?? definition.length.months ?? 1;
}
