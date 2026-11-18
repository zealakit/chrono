/**
 * A tiny semver helper for the release scripts (plan 13 R4). Chrono packages
 * take no `semver` dependency, so the release tooling carries its own.
 */
const PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

/** `{ major, minor, patch, prerelease: string[] }`, or `null` when `version` is not valid. */
export function parseVersion(version) {
  const match = PATTERN.exec(String(version));
  if (!match) {
    return null;
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] === undefined ? [] : match[4].split("."),
  };
}

const isNumeric = (value) => /^\d+$/.test(value);

function comparePrerelease(a, b) {
  // Any prerelease is lower than the release itself.
  if (a.length === 0 || b.length === 0) {
    return a.length === 0 ? (b.length === 0 ? 0 : 1) : -1;
  }
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const left = a[index];
    const right = b[index];
    if (left === undefined) return -1; // a shorter list is lower
    if (right === undefined) return 1;
    if (left === right) continue;
    const leftNumeric = isNumeric(left);
    const rightNumeric = isNumeric(right);
    if (leftNumeric && rightNumeric) {
      return Number(left) < Number(right) ? -1 : 1;
    }
    if (leftNumeric !== rightNumeric) {
      return leftNumeric ? -1 : 1; // numeric identifiers are lower
    }
    return left < right ? -1 : 1;
  }
  return 0;
}

/** `-1`, `0` or `1`. Throws on an invalid version. */
export function compareVersions(a, b) {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) {
    throw new Error(`Invalid version: ${left ? b : a}`);
  }
  for (const key of ["major", "minor", "patch"]) {
    if (left[key] !== right[key]) {
      return left[key] < right[key] ? -1 : 1;
    }
  }
  return comparePrerelease(left.prerelease, right.prerelease);
}

export const isPrerelease = (version) =>
  (parseVersion(version)?.prerelease.length ?? 0) > 0;

/** The single dist-tag rule (plan 06 R8, 13 R5): prereleases go to `next`, releases to `latest`. */
export const publishTagFor = (version) =>
  isPrerelease(version) ? "next" : "latest";
