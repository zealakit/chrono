/**
 * Attribute records returned by controllers. `true` means "present with an
 * empty value", `false` and `undefined` mean "absent". Adapters turn a record
 * into framework props; controllers never return event handlers.
 */
export type Attributes = Record<string, string | number | boolean | undefined>;

/** Later records win. `undefined` values never override. */
export function mergeAttributes(
  ...records: (Attributes | undefined)[]
): Attributes {
  const merged: Attributes = {};
  for (const record of records) {
    for (const [key, value] of Object.entries(record ?? {})) {
      if (value !== undefined) {
        merged[key] = value;
      }
    }
  }
  return merged;
}

/** Drop absent attributes and turn every value into a string (`true` becomes `""`). */
export function normalizeAttributes(
  record: Attributes,
): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined || value === false) {
      continue;
    }
    normalized[key] = value === true ? "" : String(value);
  }
  return normalized;
}
