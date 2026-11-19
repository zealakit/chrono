export {
  backspace,
  emptySegment,
  segmentOf,
  stepSegment,
  typeDigit,
} from "./segment-engine.js";
export type { SegmentDef, SegmentValue } from "./segment-engine.js";
export { fold, tokenize } from "./tokenize.js";
export type { Token } from "./tokenize.js";
export { getHiddenInputs } from "./form.js";
export type { HiddenInput } from "./form.js";
