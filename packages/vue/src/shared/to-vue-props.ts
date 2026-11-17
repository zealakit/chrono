import {
  type Attributes,
  normalizeAttributes,
} from "@zealakit/chrono-core/foundation";

/** Core attribute record to Vue props: strings only (`tabindex` stays a plain attribute). */
export function toVueProps(attributes: Attributes): Record<string, string> {
  return normalizeAttributes(attributes);
}

export type Modifiers = { shift: boolean; ctrl: boolean; meta: boolean };

export const modifiersOf = (event: KeyboardEvent): Modifiers => ({
  shift: event.shiftKey,
  ctrl: event.ctrlKey,
  meta: event.metaKey,
});
