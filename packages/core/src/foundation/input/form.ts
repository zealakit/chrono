/** One hidden `<input>` a root renders so plain forms and server actions see the value (plan 06 A15). */
export type HiddenInput = { name: string; value: string };

/** Entries without a name produce nothing; `null` submits as an empty string. */
export function getHiddenInputs(
  entries: readonly (readonly [string | undefined, string | null])[],
): HiddenInput[] {
  const inputs: HiddenInput[] = [];
  for (const [name, value] of entries) {
    if (name) {
      inputs.push({ name, value: value ?? "" });
    }
  }
  return inputs;
}
