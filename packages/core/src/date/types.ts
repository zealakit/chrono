import type { PlainDate } from "../foundation/index.js";

/** A single date, or `null` when empty (plan 06 A1). `null` is a real controlled value. */
export type DateValue = PlainDate | null;

/** Inclusive range. `{ start, end: null }` is the partial state while picking. */
export type DateRangeValue = {
  start: PlainDate | null;
  end: PlainDate | null;
} | null;

/** Sorted, unique. */
export type MultiDateValue = readonly PlainDate[];

export type PanelLevel = "day" | "month" | "year";

export type PartName = "day" | "month" | "year";
