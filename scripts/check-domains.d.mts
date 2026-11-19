export const DOMAINS: string[];
export const ALLOW: Record<string, string[]>;
export function parseImports(text: string): string[];
export function resolveRelative(
  fromFile: string,
  specifier: string,
): string | null;
export function discoverPackages(
  root: string,
): { id: string; kind: "core" | "adapter"; dir: string; name: string }[];
export function checkDomains(root: string): string[];
