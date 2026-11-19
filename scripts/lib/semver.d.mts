export type ParsedVersion = {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
};
export function parseVersion(version: string): ParsedVersion | null;
export function compareVersions(a: string, b: string): -1 | 0 | 1;
export function isPrerelease(version: string): boolean;
export function publishTagFor(version: string): "next" | "latest";
