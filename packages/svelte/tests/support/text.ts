/** ICU puts thin and no-break spaces around dashes; compare with plain spaces. */
export const norm = (text: string | null): string =>
  (text ?? "").replace(/\s/g, " ");
