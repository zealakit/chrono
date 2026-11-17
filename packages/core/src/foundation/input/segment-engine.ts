/**
 * Generic segmented-input machine (plan 06 §13.2). Pure: no DOM, no dates.
 * Date and Time describe their parts with a `SegmentDef` and drive these
 * functions from their controllers.
 */
export type SegmentDef = {
  min: number;
  max: number;
  /** Typing stops accepting digits at this length. */
  maxDigits: number;
  /** Step used by PageUp / PageDown. */
  pageStep: number;
};

/** `value` is null until the typed digits form a number in `[min, max]`. */
export type SegmentValue = { value: number | null; buffer: string };

export const emptySegment: SegmentValue = Object.freeze({
  value: null,
  buffer: "",
});

export const segmentOf = (value: number | null): SegmentValue => ({
  value,
  buffer: "",
});

/**
 * Type one digit. A buffer that would exceed `max` restarts with the digit
 * (typing `3` then `5` in a month yields `5`). `advance` is true when the
 * part cannot take another digit.
 */
export function typeDigit(
  def: SegmentDef,
  segment: SegmentValue,
  digit: number,
): { segment: SegmentValue; advance: boolean } {
  let buffer =
    segment.buffer.length >= def.maxDigits
      ? String(digit)
      : segment.buffer + digit;
  if (Number(buffer) > def.max) {
    buffer = String(digit);
  }
  const n = Number(buffer);
  if (n < def.min && buffer.length >= def.maxDigits) {
    // "00" in a day or month: nothing valid can follow, start over.
    return { segment: { value: null, buffer: "" }, advance: false };
  }
  return {
    segment: { value: n >= def.min ? n : null, buffer },
    advance:
      n >= def.min &&
      (buffer.length >= def.maxDigits ||
        (def.maxDigits === 2 && n * 10 > def.max)),
  };
}

/** Step by `delta`, wrapping inside `[min, max]`. An empty part starts at `start`. */
export function stepSegment(
  def: SegmentDef,
  segment: SegmentValue,
  delta: number,
  start: number,
): SegmentValue {
  if (segment.value === null) {
    return segmentOf(Math.min(def.max, Math.max(def.min, start)));
  }
  const range = def.max - def.min + 1;
  const offset = (((segment.value - def.min + delta) % range) + range) % range;
  return segmentOf(def.min + offset);
}

/** Backspace: drop the last typed digit, or clear a part that has no buffer. */
export function backspace(segment: SegmentValue): SegmentValue {
  if (segment.buffer.length > 1) {
    const buffer = segment.buffer.slice(0, -1);
    return { value: Number(buffer) || null, buffer };
  }
  return emptySegment;
}
