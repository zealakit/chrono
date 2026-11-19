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

/**
 * Split `--chrono-*` CSS custom properties out of an attribute record
 * (plan 05 R2): a record key starting with `--chrono-` is a style property,
 * not an attribute. Numbers become unitless strings.
 */
export function splitProperties(record: Attributes): {
  attributes: Attributes;
  properties: Record<string, string>;
} {
  const attributes: Attributes = {};
  const properties: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    if (key.startsWith("--chrono-")) {
      if (value !== undefined && value !== false) {
        properties[key] = value === true ? "" : String(value);
      }
    } else if (value !== undefined) {
      attributes[key] = value;
    }
  }
  return { attributes, properties };
}
