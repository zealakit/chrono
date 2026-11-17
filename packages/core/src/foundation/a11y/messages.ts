/** Words for states that `Intl` has no names for (D13). Only English ships. */
export type Messages = {
  today: string;
  selected: string;
  unavailable: string;
  disabled: string;
  rangeStart: string;
  rangeEnd: string;
  inRange: string;
};

export const defaultMessages: Readonly<Messages> = Object.freeze({
  today: "today",
  selected: "selected",
  unavailable: "unavailable",
  disabled: "disabled",
  rangeStart: "range start",
  rangeEnd: "range end",
  inRange: "in range",
});

export function mergeMessages(
  defaults: Readonly<Messages>,
  overrides?: Partial<Messages>,
): Messages {
  const merged: Messages = { ...defaults };
  for (const key of Object.keys(overrides ?? {}) as (keyof Messages)[]) {
    const value = overrides?.[key];
    if (value !== undefined) {
      merged[key] = value;
    }
  }
  return merged;
}
