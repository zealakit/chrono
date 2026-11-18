#!/usr/bin/env node
/**
 * Set one version in all five packages (plan 13 EC2, R4): lockstep, core included
 * (it stays private). Refuses a lower version; an equal one is a no-op.
 *
 *   node scripts/set-version.mjs <version> [--force]
 *
 * Only `packages/{core,vanilla,react,vue,svelte}/package.json` change.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compareVersions, parseVersion } from "./lib/semver.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const PACKAGE_DIRS = ["core", "vanilla", "react", "vue", "svelte"];

/**
 * Pure planning step, used by the tests: returns what would change.
 * `manifests` maps a package dir to its parsed manifest.
 */
export function planVersionChange(manifests, version, { force = false } = {}) {
  if (!parseVersion(version)) {
    throw new Error(
      `"${version}" is not a valid version (major.minor.patch[-prerelease]).`,
    );
  }
  const current = new Set(Object.values(manifests).map((m) => m.version));
  if (current.size > 1 && !force) {
    throw new Error(
      `The packages do not share a version (${[...current].join(", ")}); fix that first or pass --force.`,
    );
  }
  const from = [...current][0];
  const order = compareVersions(version, from);
  if (order === 0) {
    return {
      from,
      to: version,
      changes: [],
      note: `Already at ${version}; nothing to do.`,
    };
  }
  if (order < 0 && !force) {
    throw new Error(
      `${version} is lower than the current ${from}; pass --force to go back.`,
    );
  }
  return {
    from,
    to: version,
    changes: Object.keys(manifests),
    note: `${from} -> ${version}`,
  };
}

export function setVersion(rootDir, version, options = {}) {
  const files = Object.fromEntries(
    PACKAGE_DIRS.map((dir) => [
      dir,
      join(rootDir, "packages", dir, "package.json"),
    ]),
  );
  const manifests = Object.fromEntries(
    Object.entries(files).map(([dir, file]) => [
      dir,
      JSON.parse(readFileSync(file, "utf8")),
    ]),
  );
  const plan = planVersionChange(manifests, version, options);
  for (const dir of plan.changes) {
    const manifest = { ...manifests[dir], version };
    writeFileSync(files[dir], `${JSON.stringify(manifest, null, 2)}\n`);
  }
  return plan;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const args = process.argv.slice(2);
  const version = args.find((arg) => !arg.startsWith("--"));
  if (!version) {
    console.error("Usage: node scripts/set-version.mjs <version> [--force]");
    process.exit(1);
  }
  try {
    const plan = setVersion(root, version, { force: args.includes("--force") });
    console.log(plan.note);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
